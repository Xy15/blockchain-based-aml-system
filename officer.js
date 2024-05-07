var acc = sessionStorage.getItem("acc");
var role = sessionStorage.getItem("role");
const allowRole = ['Officer' , 'Admin Officer'];

function countTotalSusTx() {    //officer.html
    fetch('http://localhost:3000/count/susTx', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('totalFlagged').innerHTML = data.count;
        })
        .catch(error => console.error(error))
}

function getSusTx(limit, offset) {  //officer, susTx
    fetch(`http://localhost:3000/get/susTx?limit=${limit}&offset=${offset}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if(data.length > 0){
                data.forEach(async element => {
                    const time = new Date(element.timestamp * 1000).toLocaleString();
                    let row = document.getElementById('susTxList').insertRow(0);
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
                    onClickListener(sender, element['senderAddress']);
                    sender.style.cursor = "pointer";
                    if(element['recipientAddress'] != "0x0000000000000000000000000000000000000000"){
                        await fetch(`http://localhost:3000/get/client?account=${element['recipientAddress']}`, {
                            method: 'GET',
                            headers: { Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json' }
                        })
                        .then(response => response.json())
                        .then(data => {
                            recipient.innerHTML = data[0].name;
                        })
                        onClickListener(recipient, element['recipientAddress']);
                        recipient.style.cursor = "pointer";
                    }
                    row.insertCell(4).innerHTML = element['method'];
                    const descCol = row.insertCell(5);
                    descCol.innerHTML = element['description'];
                    descCol.style.maxWidth = '200px';
                    row.insertCell(6).innerHTML = element['amount'];
                    const susDescCol = row.insertCell(7);
                    susDescCol.innerHTML = element['susDescription'];
                    susDescCol.style.maxWidth = '200px';
                    row.insertCell(8).innerHTML = element['transactionStatus'];
                })
            }else{
                document.getElementById('susTxList').innerHTML = "No transactions.";
            }
            
        })
        .catch(error => console.error(error))
}

function countSusTx(status) {//officer.html
    fetch(`http://localhost:3000/count/susTx/status?status=${status}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById(status).innerHTML = data.count;
        })
        .catch(error => console.error(error))
}

//officer.html, susTx.html
function getPendingTx() {
    fetch('http://localhost:3000/get/pendingSusTx', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if(data.length > 0){
                data.forEach(async element => {
                    const time = new Date(element.timestamp * 1000).toLocaleString();
                    let row = document.getElementById('susTxList').insertRow(0);
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
                    onClickListener(sender, element['senderAddress']);
                    sender.style.cursor = "pointer";
                    if(element['recipientAddress'] != "0x0000000000000000000000000000000000000000"){
                        await fetch(`http://localhost:3000/get/client?account=${element['recipientAddress']}`, {
                            method: 'GET',
                            headers: { Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json' }
                        })
                        .then(response => response.json())
                        .then(data => {
                            recipient.innerHTML = data[0].name;
                        })
                        onClickListener(recipient, element['recipientAddress']);
                        recipient.style.cursor = "pointer";
                    }
                    row.insertCell(4).innerHTML = element['method'];
                    const descCol = row.insertCell(5);
                    descCol.innerHTML = element['description'];
                    descCol.style.maxWidth = '200px';
                    row.insertCell(6).innerHTML = element['amount'];
                    const susDescCol = row.insertCell(7);
                    susDescCol.innerHTML = element['susDescription'];
                    susDescCol.style.maxWidth = '200px';
                })
            }else{
                document.getElementById('susTxList').innerHTML = "No transactions.";
            }
        })
        .catch(error => console.error(error))
}

function countCases() { //officer.html, case.html
    fetch(`http://localhost:3000/count/cases`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('cases').innerHTML = data.count;
        })
        .catch(error => console.error(error))
}

function getCases() {   //case.html
    fetch('http://localhost:3000/get/cases  ', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if(data.length > 0){
                data.forEach(async element => {
                    const time = new Date(element.timestamp * 1000).toLocaleString();
                    let row = document.getElementById('casesList').insertRow(0);
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
                    onClickListener(sender, element['senderAddress']);
                    sender.style.cursor = "pointer"; 
                    if(element['recipientAddress'] != "0x0000000000000000000000000000000000000000"){
                        await fetch(`http://localhost:3000/get/client?account=${element['recipientAddress']}`, {
                            method: 'GET',
                            headers: { Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json' }
                        })
                        .then(response => response.json())
                        .then(data => {
                            recipient.innerHTML = data[0].name;
                        })
                        onClickListener(recipient, element['recipientAddress']);
                        recipient.style.cursor = "pointer";
                    }
                    row.insertCell(4).innerHTML = element['method'];
                    const descCol = row.insertCell(5);
                    descCol.innerHTML = element['description'];
                    descCol.style.maxWidth = '200px';
                    row.insertCell(6).innerHTML = element['amount'];
                    const susDescCol = row.insertCell(7);
                    susDescCol.innerHTML = element['susDescription'];
                    susDescCol.style.maxWidth = '200px';
                    row.insertCell(8).innerHTML = element.transactionStatus;
                })
            }else {
                document.getElementById('casesList').innerHTML = "No transactions.";
            }
        })
        .catch(error => console.error(error))
}



//Validate 1 particular pending transaction
async function validatePendingTransaction(txHash) {    //txHistory
    //retrieve data from database
    return fetch(`http://localhost:3000/findTx?hash=${txHash}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        return web3.eth.getTransactionReceipt(txHash).then(async (receipt) => {
                const log = receipt.logs[0];
                const eventABI = [
                    {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "timestamp",
                        "type": "uint256"
                    },
                    {
                        "indexed": false,
                        "internalType": "address",
                        "name": "sender",
                        "type": "address"
                    },
                    {
                        "indexed": false,
                        "internalType": "address",
                        "name": "receiver",
                        "type": "address"
                    },
                    {
                        "indexed": false,
                        "internalType": "string",
                        "name": "method",
                        "type": "string"
                    },
                    {
                        "indexed": false,
                        "internalType": "string",
                        "name": "description",
                        "type": "string"
                    },
                    {
                        "indexed": false,
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    },
                    {
                        "indexed": false,
                        "internalType": "string",
                        "name": "susDescription",
                        "type": "string"
                    }
                ]
                // Decode the event using the ABI and log data
                const event = web3.eth.abi.decodeLog( eventABI, log.data, log.topics.slice(1) );

                //compare both transaction data
                const eventDataString = event.timestamp + event.sender + event.receiver + event.method + event.description + event.amount + event.susDescription;
                const sqlDataString = data[0].timestamp + data[0].senderAddress + data[0].recipientAddress + data[0].method + data[0].description + data[0].amount + data[0].susDescription;
                if (await web3.utils.keccak256(eventDataString) != await web3.utils.keccak256(sqlDataString)){
                    await Swal.fire({
                        icon: 'warning',
                        title: 'Suspicious Transaction Detected!',
                        text: 'Transaction ' + receipt.transactionHash + " has been tampered. Associated users: " + event.sender + ", " + event.receiver
                    })
                    return false;
                } else {
                    return true;
                }
        })
    }).catch(error => {
        console.error(error)
        window.alert(error)
    });
}

async function displayAlerts(alertQueue) {
    if (alertQueue.length > 0) {
        for (const alertData of alertQueue) {       
            await Swal.fire(alertData);
        }
    }else {
        await Swal.fire({
            icon: 'success',
            title: 'Finish!',
            text: 'There is no suspicious transactions.'
        })
    }
}

async function validateIntegrity() {
    const alertQueue = [];
    await contract.getPastEvents('allEvents', {
        fromBlock: 0,
        toBlock: 'latest'
    }, async function(error, events) {
        if(error){
            await Swal.fire({
                icon: 'warning',
                title: 'Oops!',
                text: 'Something went wrong. Please try again later.'
            })
        }
        events.forEach(async event => {
            if(event.event == 'PendingTransactions') return;    //no checking for pending tx
            const alertData = {
                icon: 'warning',
                title: 'Suspicious Transaction Detected!',
                text: 'Transaction ' + event.transactionHash + " has been tampered. Associated users: " + event.returnValues.sender + ", " + event.returnValues.receiver
            }
            await fetch(`http://localhost:3000/findTx?hash=${event.transactionHash}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }).then(response => response.json())
            .then(async data => {
                if(data.length == 0){
                    alertQueue.push(alertData);
                    console.log("Transaction ", event.transactionHash, " has been tampered. Associated users: ", event.returnValues.sender, ", ", event.returnValues.receiver);
                }else {
                    let eventData = '';
                    let sqlData = '';
                    if (event.event == "Transactions") {
                        eventData = event.returnValues.timestamp + event.returnValues.sender + event.returnValues.receiver + event.returnValues.method + event.returnValues.description + event.returnValues.amount;
                        sqlData = data[0].timestamp + data[0].senderAddress + data[0].recipientAddress + data[0].method + data[0].description + data[0].amount;    
                    } else if (event.event == "SuspiciousTransactions"){
                        eventData = event.returnValues.timestamp + event.returnValues.sender + event.returnValues.receiver + event.returnValues.method + event.returnValues.description + event.returnValues.amount + event.returnValues.susDescription + event.returnValues.timeProcessed + event.returnValues.status;
                        sqlData = data[0].timestamp + data[0].senderAddress + data[0].recipientAddress + data[0].method + data[0].description + data[0].amount + data[0].susDescription + data[0].timeProcessed + data[0].transactionStatus;
                    } 
                    if (await web3.utils.keccak256(eventData) != await web3.utils.keccak256(sqlData)){
                        alertQueue.push(alertData);
                        console.log("Transaction ", event.transactionHash, " has been tampered. Associated users: ", event.returnValues.sender, ", ", event.returnValues.receiver);
                    }
                }
                displayAlerts(alertQueue);
            })
        })
    })
}



//<!-------------------------ham-------------------------------->
function searchUser(){
    var userSearch = encodeURIComponent(document.getElementById("searchUser").value);
    console.log("Searching for:", userSearch);
    window.location.href = `OfficerManageUsers.html?id=${userSearch}`;
    document.getElementById("searchUser").value = "";
}

 async function getUserInfo() {
    try {
        const token = localStorage.getItem('jwtToken');
        console.log(token);

        if (!token) {
            console.log('No token available.');
            return;
        }

        const response = await fetch('http://localhost:3000/users', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to Connect.');
        }

        const users = await response.json();
        const clients = users.clients;
        console.log('Connected Successfully.');
        console.log(clients);

        if(clients != null){
            const userList = document.getElementById('userListNormal');
        clients.forEach((user) => {
            const row = document.createElement('tr');
            row.addEventListener('click', () => {
                window.location.href = `OfficerManageUsers.html?id=${user.userID}`;
            });

            const userIDCell = document.createElement('td');
            userIDCell.textContent = user.userID;
            row.appendChild(userIDCell);

            const clientIDCell = document.createElement('td');
            clientIDCell.textContent = user.clientID;
            row.appendChild(clientIDCell);

            const nameCell = document.createElement('td');
            nameCell.textContent = user.fullName;
            row.appendChild(nameCell);

            const phoneCell = document.createElement('td');
            phoneCell.textContent = user.phoneNo;
            row.appendChild(phoneCell);

            const emailCell = document.createElement('td');
            emailCell.textContent = user.email;
            row.appendChild(emailCell);

            userList.appendChild(row);
        });
        }else{
            const row = document.createElement('tr');
            row.textContent = "No users yet.";
            userList.appendChild(row);
        }
        
    } catch (error) {
        console.error('Error fetching users:', error);
    }
 }

 //arrange by risk level
 async function getUserInfoRisk() {
    try {
        const token = localStorage.getItem('jwtToken');
        console.log(token);

        if (!token) {
            console.log('No token available.');
            return;
        }

        const response = await fetch('http://localhost:3000/users', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to Connect.');
        }

        const users = await response.json();
        const clients = users.clients;
        console.log('Connected Successfully.');
        console.log(clients);

        const userList = document.getElementById('userListRisk');
        clients.forEach((user) => {
            const row = document.createElement('tr');
            row.addEventListener('click', () => {
                window.location.href = `OfficerManageUsers.html?id=${user.userID}`;
            });

            const userIDCell = document.createElement('td');
            userIDCell.textContent = user.userID;
            row.appendChild(userIDCell);

            const clientIDCell = document.createElement('td');
            clientIDCell.textContent = user.clientID;
            row.appendChild(clientIDCell);

            const nameCell = document.createElement('td');
            nameCell.textContent = user.fullName;
            row.appendChild(nameCell);

            const phoneCell = document.createElement('td');
            phoneCell.textContent = user.phoneNo;
            row.appendChild(phoneCell);

            const emailCell = document.createElement('td');
            emailCell.textContent = user.email;
            row.appendChild(emailCell);

            const riskScoreCell = document.createElement('td');
            riskScoreCell.textContent = user.riskScore;
            row.appendChild(riskScoreCell);

            userList.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching users:', error);
    }
 }

 async function toggleTable() {
    var userTableNormal = document.getElementById("userTableNormal");
    var userTableRisk = document.getElementById("userTableRisk");
    var riskButton = document.getElementById("switchNormal");

    if (userTableNormal.style.display === "none") {
        await getUserInfo();
        userTableNormal.style.display = "table";
        userTableRisk.style.display = "none";
        riskButton.innerHTML = "View by Risk"

        // Clear the previous table's content
        clearTableContent("userTableRisk");
    } else {
        await getUserInfoRisk();
        riskButton.innerHTML = "View Normal List"
        userTableNormal.style.display = "none";
        userTableRisk.style.display = "table";

        // Clear the previous table's content
        clearTableContent("userTableNormal");
    }
}

function clearTableContent(tableId) {
    var userList = document.getElementById(tableId);
    var tbody = userList.getElementsByTagName("tbody")[0];

    // Remove all rows from the table
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }
}

// Event Subscription implemented in navBar.js