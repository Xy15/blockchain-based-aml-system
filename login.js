async function LoginDropdown(event) {
    event.preventDefault();
    var toggleButton = document.getElementById("LoginDropButton");
    var loginCancelButton = document.getElementById('LoginCancelButton')
    var cancel = document.getElementById('CancelButton')
    var content = document.querySelector('.LoginDropdown #LoginInfoDropDown');
    var username = document.getElementById('uname').value;
    var secPhrase = document.getElementById('secPhrase');

    if (username.trim() === '')
    {
      warningMsg.textContent = "Please enter your username.";
    }

    else{
      try{
      const response = await fetch('http://localhost:3000/getLogin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({username}),
      })

      if (response.ok) {
        console.log('Retreived Successfully.');
      } else {
        console.error('Failed to retreive Login details.');
      }

      const result = await response.json();
      if (result.secPhrase != null) {      
        secPhrase.textContent = `Security Phrase: ${result.secPhrase}`;
        secPhrase.style.display = "block";
        warningMsg.textContent = `Please ensure that Security Phrase is correct.`
        toggleButton.style.display = "none";
        content.style.display = "block";

      } else {
        warningMsg.textContent = 'The account does not exist. Please register account.';
        cancel.style.display = "block";
        content.style.display = "none";       
      }
    } catch(error) {
      console.error('Data could not be retreived: ', error)
    }
    }
  }

async function validateUser(){
    if(!await checkNetwork()) return;
    var username = document.getElementById('uname').value;
    var password = document.getElementById('password').value;
    
    fetch(`http://localhost:3000/get/user/account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
    })
    .then(response => response.json())
    .then(data => {
        var result = data.data;
        if(result != null){
          console.log(result.ethAddress)
          console.log(sessionStorage.getItem("acc"))
            if(result.ethAddress == sessionStorage.getItem("acc")){

                if(result.role == 'Client' && result[0].accStatus == "DEACTIVATED"){
                  window.alert("Your account has been deactivated.");
                  return;
                }
                //Login Successful
                sessionStorage.setItem("name", result[0].name);
                sessionStorage.setItem("role", result.role);
                localStorage.setItem('jwtToken', data.token);
                console.log(localStorage);
                if(result.role == 'Officer'){
                    window.location.href = 'officer.html';
                }else if (result.role == 'Admin Officer'){
                    window.location.href = 'AdminViewUsers.html';
                }else{
                    window.location.href = 'profile.html';
                }
            }else {
                //Logged in with a different Metamask account
                window.alert("Please log in with your registered Ethereum account.")
            }
        }else{
            //Invalid user
            window.alert("Username or password is wrong.");
        }
    })
    .catch(error => console.error(error))
    
}

function checkNetwork(){
	return web3.eth.net.getId().then(userNetworkId => {
		if (userNetworkId !== 5777) {   //5777 is Ganache's network id (Ethereum Mainnet's network id is 1)
			window.alert("Please connect to the Ethereum Mainnet.");
            return false;
		}else{
            return true;
		}
	})
	.catch(error => {
		console.error('Error getting network ID:', error);
	});
}