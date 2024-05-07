var previousSelected = null;
var selected = null;
var selectedTx;

$(document).ready(function() {
    if(sessionStorage.getItem("role") == "Officer"){
        showSection('officerNav');
    }else {
        showSection('adminNav');
    }
    
    document.getElementById('susTxList').addEventListener('click', function(event) {
        selected = event.target.closest('tr');
        if (previousSelected != null) {
            previousSelected.style.backgroundColor = '';
        }
        selected.style.backgroundColor = '#D3CFD6';
        selectedTx = Array.from(selected.children).map(td => td.innerText);
        document.getElementById('handleTx').style.visibility = 'visible';
        previousSelected = selected;
    })
});

async function getTxDetails(txHash){
    return fetch(`http://localhost:3000/findTx?hash=${txHash}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(txData => {
        return txData;
    })
}

async function validateAccBalance(txData){  //validate both sender's & receiver's account balance
        return contract.methods.getBalances(txData[0].senderAddress).call({ from: acc }).then(async function(bal) {
            return fetch(`http://localhost:3000/get/balance?account=${txData[0].senderAddress}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(response => response.json())
            .then(accData => {
                if(accData[0].balance != bal){
                    fetch(`http://localhost:3000/freezeAccount?account=${acc}`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    }).then(response => response.json())
                    .then(data => {
                        Swal.fire({
                            icon: 'warning',
                            title: 'Notice',
                            text: 'Account ' + txData[0].senderAddress + '\'s balance is invalid. This account has been freezed.'
                        })
                        return false;
                    })
                    .catch(error => {
                        console.error(error)
                    });
                } else if (txData[0].recipientAddress != '0x0000000000000000000000000000000000000000'){
                    return contract.methods.getBalances(txData[0].recipientAddress).call({ from: acc }).then(async function(bal) {
                        return fetch(`http://localhost:3000/get/balance?account=${txData[0].recipientAddress}`, {
                            method: 'GET',
                            headers: { 'Content-Type': 'application/json' }
                        })
                        .then(response => response.json())
                        .then(accData => {
                            if(accData[0].balance != bal){
                                Swal.fire({
                                    icon: 'warning',
                                    title: 'Notice',
                                    text: 'Account ' + txData[0].recipientAddress + '\'s balance is invalid.'
                                })
                                return false;
                            }else{
                                return true;
                            }
                        })
                    })
                }else {
                    return true;
                }
            })
        }).catch(error => {
            console.error(error)
        });
}

function getAccBalance(acc){  
    return fetch(`http://localhost:3000/get/balance?account=${acc}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
		return data[0].balance;
    })
    .catch(error => {
        console.error(error)
    });
}

async function approve(){
    const txHash = selectedTx[0];
    const txData = await getTxDetails(txHash);
    
    //validate transaction (prevint approving of transaction from suspicious user)
    if(!await validateAccBalance(txData)) return;
    if(!await validatePendingTransaction(txHash)) return; 
    
    if(txData[0].method == 'Deposit'){
        contract.methods.approveDepositTx(txData[0].timestamp, txData[0].senderAddress, txData[0].recipientAddress, txData[0].method, txData[0].description, txData[0].amount, txData[0].susDescription).send({from:acc}).then(result => {
            updateTxStatus('Approved', txHash, result.events.SuspiciousTransactions.returnValues['timeProcessed'], result.transactionHash);
            updateBalanceDeposit(txData[0].senderAddress, txData[0].amount);
            location.reload();
        });
    }else if(txData[0].method == "Withdraw" || txData[0].method == "Transfer"){
        const currentBal = await getAccBalance(txData[0].senderAddress);
        console.log(currentBal, " Amount: ", txData[0].amount)
        if(currentBal >= txData[0].amount){ //check if sufficient balance
            if(txData[0].method == "Withdraw"){
                contract.methods.approveWithdrawTx(txData[0].timestamp, txData[0].senderAddress, txData[0].recipientAddress, txData[0].method, txData[0].description, txData[0].amount, txData[0].susDescription).send({from: acc}).then(result => {
                    updateTxStatus('Approved', txHash, result.events.SuspiciousTransactions.returnValues['timeProcessed'], result.transactionHash);
                    updateBalanceWithdraw(txData[0].senderAddress, txData[0].amount);
                    location.reload();
                })
            }else{
                contract.methods.approveTransferTx(txData[0].timestamp, txData[0].senderAddress, txData[0].recipientAddress, txData[0].method, txData[0].description, txData[0].amount, txData[0].susDescription).send({from: acc}).then(result => {
                    updateTxStatus('Approved', txHash, result.events.SuspiciousTransactions.returnValues['timeProcessed'], result.transactionHash);
                    updateBalanceTransfer(txData[0].senderAddress, txData[0].recipientAddress, txData[0].amount);
                    location.reload();
                })
            }
        } else{ //balance not enough for withdraw/transfer
            //Transaction Failed
            const status = "Failed";
            console.log(txData[0])
            contract.methods.denyPendingTx(txData[0].timestamp, txData[0].senderAddress, txData[0].recipientAddress, txData[0].method, txData[0].description, txData[0].amount, txData[0].susDescription, status).send({from:acc}).then(result => {
                console.log(result)
                updateTxStatus(status, txHash, result.events.SuspiciousTransactions.returnValues['timeProcessed'], result.transactionHash);
                location.reload();
            })
        }
    }
}


async function deny(){
    const txHash = selectedTx[0];
    const txData = await getTxDetails(txHash);
    const status = "Denied";
    
    //validate and display alert to notify officer when balance or transaction data is invalid
    await validateAccBalance(txData);
    await validatePendingTransaction(txHash); 
    //deny transaction
    contract.methods.denyPendingTx(txData[0].timestamp, txData[0].senderAddress, txData[0].recipientAddress, txData[0].method, txData[0].description, txData[0].amount, txData[0].susDescription, status).send({from:acc}).then(result => {
        updateTxStatus(status, txHash, result.events.SuspiciousTransactions.returnValues['timeProcessed'], result.transactionHash);
        //Increase user's riskScore by 1;
        fetch(`http://localhost:3000/update/riskScore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account: txData[0].senderAddress })
        })
        .then(response => response.json())
        .then(data =>{
            console.log(data);
        })
        .catch(error => console.error(error))
        location.reload();
    })
}

function updateTxStatus(status, txHash, timeProcessed, newHash){
    fetch(`http://localhost:3000/update/txStatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status, hash: txHash, officerAddress: acc, timeProcessed: timeProcessed, newHash: newHash })
    })
    .then(response => response.json())
    .catch(error => console.error(error))
}