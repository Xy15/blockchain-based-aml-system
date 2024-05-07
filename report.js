const urlParams = new URLSearchParams(window.location.search);
    const txHash = urlParams.get('txHash');
    const subjectType = urlParams.get('subjectType');
    const susDesc = urlParams.get('susDesc');

    if(sessionStorage.getItem('name') == null){
        window.alert("Please login to your account.")
        window.location.href = 'index.html';
    }    
    fetch(`http://localhost:3000/findSusTx?hash=${txHash}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    })
    .then(response => response.json())
    .then(txData => {
        let subjectAccount = txData[0].senderAddress;
        document.getElementById('partISubjectType').textContent = subjectType;
        const token = localStorage.getItem('jwtToken');
        if(subjectType == "Receiver"){
            subjectAccount = txData[0].recipientAddress;
        }
        fetch(`http://localhost:3000/get/client?account=${subjectAccount}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(clientData => {
            console.log(clientData)
            document.getElementById('partISubjectName').textContent = clientData[0].name;
            document.getElementById('partIAddress').textContent = clientData[0].address;
            document.getElementById('partIDOB').textContent = new Date(clientData[0].dateofbirth).toISOString().split('T')[0];
            document.getElementById('partIPhoneNo').textContent = clientData[0].phoneNo;
            document.getElementById('partIWalletAddress').textContent = clientData[0].ethAddress;
        })
        
        const time = new Date(txData[0].timestamp * 1000).toLocaleString();
        document.getElementById('partIITxDate').textContent = time;
        document.getElementById('partIIAmount').textContent = txData[0].amount;
        document.getElementById('partIITxHash').textContent = txHash;
        document.getElementById('partIIMethod').textContent = txData[0].method;
        document.getElementById('partIISusActivity').textContent = txData[0].susDescription + susDesc;

            //get officer details
        fetch(`http://localhost:3000/get/officer?account=${sessionStorage.getItem("acc")}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(officerData => {
            document.getElementById('partIIIReporter').textContent = officerData[0].name;
            document.getElementById('partIIIDateReported').textContent = new Date().toLocaleString();
            document.getElementById('partIIIReporterPhone').textContent = officerData[0].phoneNo;
        })
    })
    .catch(error => {
        console.error(error) 
    });