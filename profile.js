var urlParams = new URLSearchParams(window.location.search);
var user = urlParams.get('account');
var acc = sessionStorage.getItem("acc");
var role = sessionStorage.getItem("role");
const allowRole = ['Officer', 'Client', 'Admin Officer'];

$(document).ready(async function() {
    
    if(role != 'Client' && user == null){
        window.alert("Please select a user to view profile.")
        window.history.back();
    }else if(user == null){ //Client viewing own profile
        user = acc;
    }

    if(role == "Officer"){
        showSection('officerNav');
    }else if(role == "Client"){
        showSection('clientNav');
    } else {
        showSection('adminNav');
    }

    if(role != 'Client' || user == acc){
        document.getElementById("currentBalance").innerHTML = await getBalance(user);
    }
    getClientDetails();
    countUserTx();
    getUserTx(100,0);
    getUserSusTx();
})

function getClientDetails(){
    const token = localStorage.getItem('jwtToken');
    console.log(token);

    fetch(`http://localhost:3000/get/client?account=${user}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    })
    .then(response => response.json())
    .then(data => {
        if(data.length > 0){
            console.log(data[0]);
            document.getElementById("ethereumAccount").innerHTML = user;
            document.getElementById('name').innerHTML = data[0].name;
            document.getElementById('riskLevel').innerHTML = data[0].riskScore;
            if(sessionStorage.getItem('role') != 'Client' || user == acc){
                document.getElementById('bankAccount').innerHTML = data[0].accNo;
                tableDisplayAccounts(data[0]);
            }else{
                document.getElementById('UserDisplay').style.display = "none";
            }
        }
    })
    .catch(error => console.error(error))
}

function tableDisplayAccounts(data) {
    const tableAccount = document.getElementById('table-body-account');
    tableAccount.innerHTML = 
    `
    <tr>
        <td>${data.accNo}</td>
        <td>${data.accType}</td>
        <td>${data.balance}</td>
    </tr>
    `;
    console.log(data);

    }

function countUserTx(){
    fetch(`http://localhost:3000/count/userTx?account=${user}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('txCount').innerHTML = data.count;
    })
    .catch(error => console.error(error))
}

function getUserSusTx(){
    fetch(`http://localhost:3000/get/userSusTx?account=${user}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if(data.length > 0){
            data.forEach(async element => {
                const time = new Date(element.timestamp * 1000).toLocaleString();
                let row = document.getElementById('userSusTxTable').insertRow(0);
                row.insertCell(0).innerHTML = element.transactionHash;
                row.insertCell(1).innerHTML = time;
                const sender = row.insertCell(2);
                const receiver = row.insertCell(3);
                const token = localStorage.getItem('jwtToken');
                await fetch(`http://localhost:3000/get/client?account=${element['senderAddress']}`, {
                    method: 'GET',
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'}
                })
                .then(response => response.json())
                .then(data => {
                    console.log(data[0].name);
                    sender.innerHTML = data[0].name;
                })
                if(element.senderAddress != user){
                    onClickListener(sender, element['senderAddress']);
                    sender.style.cursor = "pointer";
                }
                if(element.method == 'Transfer'){
                    await fetch(`http://localhost:3000/get/client?account=${element['recipientAddress']}`, {
                        method: 'GET',
                        headers: 
                        {   Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json' }
                    })
                    .then(response => response.json())
                    .then(data => {
                        receiver.innerHTML = data[0].name;
                    })
                    if(element.recipientAddress != user){
                        onClickListener(receiver, element['recipientAddress']);
                        receiver.style.cursor = "pointer";
                    }
                }
                row.insertCell(4).innerHTML = element.method;
                const descCol = row.insertCell(5);
                descCol.innerHTML = element['description'];
                descCol.style.maxWidth = '200px';
                row.insertCell(6).innerHTML = element['amount'];
                const susDescCol = row.insertCell(7);
                susDescCol.innerHTML = element['susDescription'];
                susDescCol.style.maxWidth = '200px';
                susDescCol.style.fontSize = '13px';
                row.insertCell(8).innerHTML = element.transactionStatus;
            })
        } else {
            document.getElementById('userSusTxTable').innerHTML = "No transactions.";
        }
    })
    .catch(error => console.error(error))
}

function getUserTx(limit, offset) {
    fetch(`http://localhost:3000/get/user/recentTx?account=${user}&limit=${limit}&offset=${offset}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if(data.length > 0){
                data.forEach(async element => {
                    const time = new Date(element.timestamp * 1000).toLocaleString();
                    let row = document.getElementById('userTxTable').insertRow(0);
                    row.insertCell(0).innerHTML = element.transactionHash;
                    row.insertCell(1).innerHTML = time;
                    const associatedUser = row.insertCell(2);
                    const token = localStorage.getItem('jwtToken');
                    if(element.method == 'Transfer'){
                        if(element.senderAddress == user){
                            await fetch(`http://localhost:3000/get/client?account=${element['recipientAddress']}`, {
                                method: 'GET',
                                headers: { 
                                    Authorization: `Bearer ${token}`,
                                    'Content-Type': 'application/json' }
                            })
                            .then(response => response.json())
                            .then(data => {
                                associatedUser.innerHTML = data[0].name;
                            })
                            onClickListener(associatedUser, element['recipientAddress']);
                        }else {
                            await fetch(`http://localhost:3000/get/client?account=${element['senderAddress']}`, {
                                method: 'GET',
                                headers: { Authorization: `Bearer ${token}`,
                                'Content-Type': 'application/json' }
                            })
                            .then(response => response.json())
                            .then(data => {
                                associatedUser.innerHTML = data[0].name;
                            })
                            onClickListener(associatedUser, element['senderAddress']);
                        }
                    }
                    const descCol = row.insertCell(3);
                    descCol.innerHTML = element['description'];
                    descCol.style.maxWidth = '200px';
                    if(element['method'] == 'Deposit' || element.method == 'Transfer' && element.recipientAddress == user){
                        //user is the receiver = Debit
                        row.insertCell(4).innerHTML = element['amount'];
                        row.insertCell(5);
                    }else if(element.method == 'Withdraw' || element.method == 'Transfer' && element.senderAddress == user){
                        //user is the sender = Credit
                        row.insertCell(4);
                        row.insertCell(5).innerHTML = element['amount'];
                    }
                })
            } else {
                document.getElementById('userTxTable').innerHTML = "No transactions.";
            }
        })
        .catch(error => console.error(error))
}