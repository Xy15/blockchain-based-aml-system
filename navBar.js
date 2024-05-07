$(document).ready(async function() {   
    const username = sessionStorage.getItem('name');
    if(username == null){
        await Swal.fire({
            icon: 'error',
            text: 'Please login to your account.',
            footer: '<a href="ClientRegistration.html">Register an account.</a>'
            }).then((result) => {
                window.location.href = 'index.html'; 
        })
    }else if(!checkUserRole(allowRole)){
        await Swal.fire({
            icon: 'error',
            text: 'You do not have permission to access this page.'
            }).then((result) => {
                window.history.back();
            })
    } else {
        // Update the content of the username banner with the retrieved username
        const usernameBanner = document.getElementById('usernameBanner');
        usernameBanner.textContent = `Welcome, ${username}!`;
    }

    if(sessionStorage.getItem("role").includes("Admin")){
        subscribe();
    }

    //Prevent user change to another Ethereum account
    window.ethereum.on('accountsChanged', function () {
        //Redirect the user back to the login page to prevent the user make transactions with another account
        window.alert("Please do not change your Ethereum account.");
        logout();
    })
    //Prevent user change to another network
    window.ethereum.on('chainChanged', () => {
        window.alert("Please do not change your network.");
        logout();
    });
})

function checkUserRole(allowedRoles){
    const currentUserRole = sessionStorage.getItem('role');
    if(allowedRoles.includes(currentUserRole)){
        return true;
    }else {
        return false;
    }
}

function logout() {
    // Remove the login state from sessionStorage
    sessionStorage.removeItem('name'); 
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('acc');
    window.location.href = 'index.html';
}

function getUserProfile(address){
    if(address.length != 42){
        //invalid format
        window.alert("Invalid Ethereum Address.")
        return;
    }else{
        //validate address
        fetch(`http://localhost:3000/get/searchAcc?account=${address}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if(data.length === 0){
                window.alert("Invalid Ethereum Address.")
                return;
            }else {
                window.location.href = `profile.html?account=${address}`;
            }
        })
    } 
}

function showSection(eventType) {
    // Hide all event sections
    const eventSections = document.querySelectorAll('.hide');
    eventSections.forEach(section => section.classList.add('d-none'));

    // Show the selected event section
    const selectedSection = document.getElementById(eventType);
    selectedSection.classList.remove('d-none');
}

//Officer roles - Alerting
async function subscribe(){
    const signature = "0x012921549cadd166ead5357727f7d6283e082714814b844b54ea5108d36b0a4c";
    web3.eth.subscribe('logs', {
        topics: [signature]
    }, (error) => {
        if (error)
            console.error(error);
    }).on("connected", function (subscriptionId) {
        console.log("Subscribed with subscrition id ", subscriptionId);
    }).on("data", function (log) {
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
        if(event.method == 'Deposit' || event.method == 'Withdraw'){
            Swal.fire({
                icon: 'warning',
                title: 'Suspicious Transaction Detected!',
                html: '<p><b>Transaction Hash: </b>' + log.transactionHash + "</p><p><b>Method: </b>" + event.method + "</p><p><b>Associated users: </b>" + event.sender + "</p>"
            })
        }else {
            Swal.fire({
                icon: 'warning',
                title: 'Suspicious Transaction Detected!',
                html: '<p><b>Transaction Hash: </b>' + log.transactionHash + "</p><p><b>Method: </b>" + event.method + "</p><p><b>Associated users: </b>" + event.sender + ", " + event.receiver + "</p>"
            })
        }
    })
    
}