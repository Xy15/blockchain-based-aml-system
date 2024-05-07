//address(0) = null address = "0x0000000000000000000000000000000000000000"
var balance;
const allowRole = ['Client'];

$(document).ready(async function() {
    const acc = sessionStorage.getItem("acc");
    balance = await getBalance(acc);

    document.querySelector('.dropdown-menu').addEventListener('click', function(event) {
        event.preventDefault();
        if (event.target.tagName === 'A') {
            const eventType = event.target.dataset.eventType;
            showSection(eventType);
        }
    });  

    // Retrieve the event type from the query parameter in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const selectedEventType = urlParams.get('event');
    // Click the corresponding button based on the event type
    if (selectedEventType === 'deposit') {
        document.querySelector('#depositButton').click();
    } else if (selectedEventType === 'withdraw') {
        document.querySelector('#withdrawButton').click();
    } else if (selectedEventType === 'transfer') {
        document.querySelector('#transferButton').click();
    } else {
        // If eventType is null or not recognized, show the default event section
        document.querySelector('#depositButton').click();
    }     
})


async function deposit(event){
    const acc = sessionStorage.getItem("acc");
    if(!await checkBalance(acc, balance)){
        return;
    }
    const amount = $('#amountDeposit').val();
    if (validateAmount(amount)) {
        const receiver = "0x0000000000000000000000000000000000000000";    //null address
        const method = "Deposit";
        const desc = $('#descDeposit').val();
        isSuspiciousTransaction(acc, receiver, amount, method).then((result) => {
            if (result.isSuspicious) { //insert into suspicious transaction event and table
                addSusTransaction(acc, receiver, method, desc, amount, result.susDesc);
            } else { //not suspicious
                //call contract
                contract.methods.deposit(desc, amount).send({
                    from: acc
                }).then(async (result) => {
                    const timestamp = (await web3.eth.getBlock(result.blockNumber)).timestamp;
                    updateBalanceDeposit(acc, amount);
                    addTransaction(acc, receiver, method, desc, amount, timestamp, result.transactionHash);
                }).catch((error) => {
                    if (error.code === 4001) {
                        window.alert('Permissions needed to continue.')
                    } else if (error.code === 4100) {
                        window.alert("Please connect to your saved Metamask account with the address: " + acc);
                    } else {
                        window.alert(error);
                    }
                })
            }
        })
    }
    event.preventDefault();
}

async function withdraw(event){
    const acc = sessionStorage.getItem("acc");
    if(!await checkBalance(acc, balance)){
        return;
    }
    const amount = $('#amountWithdraw').val();
    //check valid amount
    if (validateAmount(amount)) {
        if (amount > balance) {
            window.alert("Insufficient balance.");
        } else {
            const desc = $('#descWithdraw').val();
            const method = "Withdraw";
            const receiver = "0x0000000000000000000000000000000000000000";    //null address
            isSuspiciousTransaction(acc, receiver, amount, method).then((result) => {
                //check isSuspicious
                if (result.isSuspicious) { //insert into suspicious transaction event and table
                    addSusTransaction(acc, receiver, method, desc, amount, result.susDesc);
                } else {
                    contract.methods.withdraw(desc, amount).send({ from: acc })
                    .then(async (result) => {
                        const timestamp = (await web3.eth.getBlock(result.blockNumber)).timestamp;
                        updateBalanceWithdraw(acc, amount);
                        addTransaction(acc, receiver, method, desc, amount, timestamp, result.transactionHash);
                    }).catch((error) => {
                        if (error.code === 4001) {
                            window.alert('Permissions needed to continue.')
                        } else {
                            window.alert(error);
                        }
                    })
                }
            })
        }
    }
    event.preventDefault();
}

async function transfer(event){
    const acc = sessionStorage.getItem("acc");
    if(!await checkBalance(acc, balance)){
        return;
    }
    const amount = $('#amountTransfer').val();
    if (validateAmount(amount)) {
        const receiver = $('#receiver').val();
        const desc = $('#descTransfer').val();
        const method = "Transfer";

        //validate input
        if (receiver == "") {
            window.alert("Must enter receiver address.");
            return;
        } else if (receiver.length != 42) {
            window.alert("Incorrect format for receiver address.");
            return;
        } else if (receiver == acc) {
            window.alert("You can't send money to yourself.");
            return;
        } else if (amount > balance) {
            window.alert("Insufficient balance.");
            return;
        } else if (!await isValidUser(receiver) || !await isValidStatus(receiver)){
            window.alert("Invalid receiver address. Please make sure the receiver address is registered and available.");
            return;
        }

        //check suspicious
        isSuspiciousTransaction(acc, receiver, amount, method).then((result) => {
            //check isSuspicious
            if (result.isSuspicious) { //insert into suspicious transaction event and table
                addSusTransaction(acc, receiver, method, desc, amount, result.susDesc);
            } else {
                try {
                    contract.methods.transfer(receiver, desc, amount).send({
                        from: acc
                    }).then(async (result)=>{
                        const timestamp = (await web3.eth.getBlock(result.blockNumber)).timestamp;
                        updateBalanceTransfer(acc, receiver, amount);
                        addTransaction(acc, receiver, method, desc, amount, timestamp, result.transactionHash);
                    }).catch((error) => {
                        if (error.code === 4001) {
                            window.alert('Permissions needed to continue.')
                        } else if (error.code === 4100) {
                            window.alert("Please connect to your saved Metamask account with the address: " + acc);
                        } else {
                            window.alert(error);
                        }
                    })
                } catch (ex) {
                    window.alert("Invalid receiver address.")
                    window.alert(ex)
                }
            }
        })
    }
    event.preventDefault();
}

function validateAmount(amount) {
    if (isNaN(amount) || amount <= 0) {
        window.alert("Please enter valid amount value.");
        return false;
    }
    return true;
}

//insert new transaction into database
function addTransaction(sender, receiver, method, desc, amount, timestamp, txHash) {
    fetch('http://localhost:3000/insert/tx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender, receiver, method, desc, amount, timestamp, txHash })
        })
        .then(response => response.json())
        .then(async data => {
            await Swal.fire(
                'Success',
                'Transaction is completed.',
                'success'
            )
            location.reload();
        })
        .catch(error => {
            console.error(error)
        });
}

function addSusTransaction(sender, receiver, method, desc, amount, susDesc) {    
    const status = "Pending";
    const ethAddress = null;
    const timeProcessed = null;

    contract.methods.susTransaction(receiver, method, desc, amount, susDesc).send({
        from: sender
    }).then((result) => {
        console.log(result)
        const timestamp = result.events.PendingTransactions.returnValues['timestamp'];
        const txHash = result.transactionHash;
        fetch('http://localhost:3000/insert/susTx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender, receiver, method, desc, amount, timestamp, txHash, status, susDesc, ethAddress, timeProcessed })
        }).then(response => response.json())
        .then(async data => {
            await Swal.fire(
                'Success',
                'Transaction is waiting to be approved.',
                'success'
            )
            location.reload();
        })
        .catch(error => console.error(error));
    }).catch((error) => {
        if (error.code === 4001) {
            window.alert('Permissions needed to continue.')
        } else if (error.code === 4100) {
            window.alert("Please connect to your saved Metamask account with the address: " + acc);
        } else {
            window.alert(error);
        }
    })
}

async function isSuspiciousTransaction(sender, receiver, amount, method) { //return bool & susDesc
    let isSuspicious = false;
    let susDesc = '';

    if (amount >= 10000) {  //amount exceeds threshold
        isSuspicious = true;
        susDesc = "Transaction amount exceeds threshold.";
    }else if(await isSus(`http://localhost:3000/count/txFrequency?sender=${sender}`)){//Transaction frequency from same user exceeds threshold (5) within 1 day
        isSuspicious = true;
        susDesc = "Transaction frequency from same user exceeds threshold.";
    }else if(await isSus(`http://localhost:3000/count/transactions/deposit_withdraw?account=${sender}`)){  //Number of withdrawal and deposit > 5 within 10 days.
        isSuspicious = true;
        susDesc = "Number of withdrawal and deposit > 5 within 10 days.";
    }else if(await isSus(`http://localhost:3000/count/transactions/all?account=${sender}`)){   //Number of transactions > 15 within 30 days
        isSuspicious = true;
        susDesc = "Number of transactions > 15 within 30 days.";
    }else if((method == 'Withdraw' || method =='Transfer') && await isSus(`http://localhost:3000/count/lastTx?account=${sender}`)){//Make withdrawal as soon as received (within 10 minutes)
        isSuspicious = true;
        susDesc = "Make withdrawal as soon as received (within 10 minutes).";
    }else if (await isSus(`http://localhost:3000/count/txAmount?account=${sender}`)){//The number of transactions between $9,000 and $10,000 exceeds 5 within 30 days.
        isSuspicious = true;
        susDesc = "The number of transactions between $9,000 and $10,000 exceeds 5 within 30 days.";
    }else if(amount >= 5000 && await isSus(`http://localhost:3000/count/risk?sender=${sender}&receiver=${receiver}`)){//Transaction amount > $5,000 AND associated user’s risk score level == high
        isSuspicious = true;
        susDesc = "Transaction amount >= $5,000 AND associated user’s risk score level == high.";
    }else if(await isSus(`http://localhost:3000/count/user/blacklisted?sender=${sender}&receiver=${receiver}`)){//Transaction is associated with a blacklisted user
        isSuspicious = true;
        susDesc = "Transaction is associated with a blacklisted user.";
    }else if(await isSus(`http://localhost:3000/count/user/highRisk?sender=${sender}&receiver=${receiver}`)){//Transaction involved high-risk users
        isSuspicious = true;
        susDesc = "Transaction involved high-risk users.";
    }

    // console.log(isSuspicious, susDesc)
    return { isSuspicious, susDesc };
}

function isSus(url){
    return new Promise((resolve, reject) => {
    fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        })
        .then(response => response.json())
        .then(data => {
            if(data.isSus){
                resolve(true)
            }else{
                resolve(false)
            }
        })
        .catch(error => {
            console.error(error) 
            reject(error)
        });
    })
}

async function isValidUser(address){
    const token = localStorage.getItem('jwtToken');
    return fetch(`http://localhost:3000/get/client?account=${address}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if(data.length > 0){
            return true;
        }else {
            return false;
        }
    })
}

async function isValidStatus(address){
    const token = localStorage.getItem('jwtToken');
    return fetch(`http://localhost:3000/get/client/status?account=${address}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if(data.length > 0){
            return true;
        }else {
            return false;
        }
    })
}