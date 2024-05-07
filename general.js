function onClickListener(element, account) {
    element.addEventListener('click', function() {
        var url = 'profile.html?account=' + encodeURIComponent(account);
        window.location.href = url;
    })
}

function getBalance(acc){    //transfer, profile.js
    return fetch(`http://localhost:3000/get/balance?account=${acc}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        //display current balance
		return data[0].balance;
    })
    .catch(error => {
        console.error(error)
    });
}

async function checkBalance(acc, balance){
		return contract.methods.getBalances().call({ from: acc }).then(function(bal) {
            if(balance == bal){  //valid balance (have not been tampered)
                return true;
            } else {
                //freeze account
                fetch(`http://localhost:3000/freezeAccount?account=${acc}`, {
                     method: 'GET',
                     headers: { 'Content-Type': 'application/json' }
                 }).then(response => response.json())
                 .then(data => {
                     Swal.fire({
                         icon: 'warning',
                         title: 'Notice',
                         text: 'Your account has been frozen.'
                         })
                 })
                 .catch(error => {
                     console.error(error)
                 });
            }
            return false;
        })
}

function getRecentTx(limit, offset) {   //txhistory, officer
    fetch(`http://localhost:3000/get/recentTx?limit=${limit}&offset=${offset}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if(data.length > 0){
                data.forEach(async element => {
                    const time = new Date(element.timestamp * 1000).toLocaleString();
                    let row = document.getElementById('txList').insertRow(0);
                    row.insertCell(0).innerHTML = element.transactionHash;
                    row.insertCell(1).innerHTML = time;
                    const sender = row.insertCell(2);
                    const recipient = row.insertCell(3);
                    const token = localStorage.getItem('jwtToken');
                    
					await fetch(`http://localhost:3000/get/client?account=${element['senderAddress']}`, {
                            method: 'GET',
                            headers: { Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json' }
                        })
                        .then(response => response.json())
                        .then(data => {
                            sender.innerHTML = data[0].name;
                        })
                    row.insertCell(4).innerHTML = element['method'];
                    const descCol = row.insertCell(5);
					descCol.innerHTML = element['description'];
                    descCol.style.maxWidth = '200px';
                    row.insertCell(6).innerHTML = element['amount'];
                    let user = sessionStorage.getItem("acc");
                    
                    if(!(element['recipientAddress'] == '0x0000000000000000000000000000000000000000')){//null address (no recipient)
						await fetch(`http://localhost:3000/get/client?account=${element['recipientAddress']}`, {
                            method: 'GET',
                            headers: { Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json' }
                        })
                        .then(response => response.json())
                        .then(data => {
                            recipient.innerHTML = data[0].name;
                        })
                        if(element['recipientAddress'] != user){
                            onClickListener(recipient, element['recipientAddress']);
                            recipient.style.cursor = "pointer";
                        }
                    }
                    if(sender.textContent != user){
                        onClickListener(sender, element['senderAddress']);
                        sender.style.cursor = "pointer";
                    }
                })
            } else {
                document.getElementById('txList').innerHTML = "No transactions.";
            }
        })
        .catch(error => console.error(error))  
}


function updateBalanceDeposit(sender, amount){  //transfer.js susTx.js
    fetch('http://localhost:3000/update/balance/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender, amount })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error(error)
    });
}

function updateBalanceWithdraw(sender, amount){ //transfer.js susTx.js
    fetch('http://localhost:3000/update/balance/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender, amount })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error(error)
    });
}

function updateBalanceTransfer(sender, receiver, amount){   //transfer.js susTx.js
    fetch('http://localhost:3000/update/balance/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender, receiver, amount })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error(error)
    });
}