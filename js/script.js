function login() {
    const scope = "https://www.googleapis.com/auth/spreadsheets" +
                  " https://www.googleapis.com/auth/userinfo.email" +
                  " https://www.googleapis.com/auth/userinfo.profile";
    const client_id = "742523799324-veqnta69uporpb2oilb1k24srn5f9fm7.apps.googleusercontent.com";
    const redirect_uri = "https://mackaysposito.github.io/50raffle";

    const tokenURL = "https://accounts.google.com/o/oauth2/v2/auth?client_id=" + client_id + 
        "&redirect_uri=" + encodeURIComponent(redirect_uri) + 
        "&response_type=token&scope=" + encodeURIComponent(scope);
    window.location.href = tokenURL; //redirect to authentication screen
}

function getToken() {
    const urlSearchParams = new URLSearchParams(window.location.search);
    var token = urlSearchParams.get("access_token");
    if (token == null) {
        var token = window.location.hash.split("access_token=")[1].split("&")[0];
    }
    return token;
}

async function getData() {
    const token = getToken();
    var sheetData = await fetch("https://sheets.googleapis.com/v4/spreadsheets/1N9hdRI_tZXHD6TbWu3RmO4t5oI8tZGqDyEtGSge6jEo/values/Sheet1?access_token=" + token)
        .then((response) => response.json())
        .then((json) => JSON.stringify(json));
    return sheetData;
}

async function countTickets() {
    document.getElementById("availableTix").innerHTML = "Gathering info, please wait..."

    var spreadsheet = await getData(); //spreadsheet response
    var sheetData = JSON.parse(spreadsheet); //spreadsheet data
    var user = await getCurrentUser();

    //TODO: generate first 50 tickets
    var exists = false;
    for (ticket in sheetData.values) {
        if (sheetData.values[ticket][1] == user) {
            exists = true;
            break;
        }
    }

    if (!exists) {
        document.getElementById("availableTix").innerHTML = "Generating tickets, please wait..."
        const token = getToken(); //access token
        var lastTicket = parseInt(sheetData.values[sheetData.values.length - 1][0]);
        for (nextTicket = lastTicket + 1; nextTicket <= lastTicket + 50; nextTicket++) {
            var row = sheetData.values.length;
            await fetch("https://sheets.googleapis.com/v4/spreadsheets/1N9hdRI_tZXHD6TbWu3RmO4t5oI8tZGqDyEtGSge6jEo/values/A" + row + 
                ":append?valueInputOption=RAW&insertDataOption=OVERWRITE&access_token=" + token, {
                    method: "POST",
                    body: JSON.stringify({
                        "range": "A" + row,
                        "majorDimension": "ROWS",
                        "values": [
                            [nextTicket, user]
                        ]
                    })});
        }
    }

    document.getElementById("availableTix").innerHTML = "Counting tickets, please wait..."

    var spreadsheet = await getData(); //spreadsheet response
    var sheetData = JSON.parse(spreadsheet); //spreadsheet data
    var availableTix = 0;

    for (ticket in sheetData.values) {
        if (sheetData.values[ticket][1] == user && sheetData.values[ticket].length <= 2) {
            availableTix++;
        }
    }

    document.getElementById("availableTix").innerHTML = "You have " + availableTix + " available tickets";
    document.getElementById("number").max = availableTix;
    document.getElementById("submit").disabled = false;
}

async function requestPrize() {
    const token = getToken(); //access token
    const spreadsheet = await getData(); //spreadsheet response
    const sheetData = JSON.parse(spreadsheet); //spreadsheet data
    var user = await getCurrentUser();
    var ticketsSpent = document.getElementById("number").value; //user-inputted ticket quantity to submit
    var prizeOptions = document.getElementById("prize");
    var prize = prizeOptions.value; //user-inputted prize pool

    if (ticketsSpent == 0) {
        alert("Submit at least 1 ticket.")
        return;
    }

    if (!confirm("Submit " + ticketsSpent + " tickets for " + prizeOptions.options[prizeOptions.selectedIndex].text + "?")) {
        return;
    }

    if (prize == "") {
        alert("Select a prize first!");
        return;
    }

    document.getElementById("availableTix").innerHTML = "Submitting tickets, please wait..."
    document.getElementById("submit").disabled = true;

    var row; //row of the spreadsheet
    for (r = 1, tickets = 0; r < sheetData.values.length && tickets < ticketsSpent; r++) { //parse each row until all submitted tickets are accounted for
         if (sheetData.values[r][1] == user && sheetData.values[r].length <= 2) { //if user matches and ticket hasn't been redeemed
            row = r + 1; //r is 0-base index, spreadsheet rows are 1-base index
            await fetch("https://sheets.googleapis.com/v4/spreadsheets/1N9hdRI_tZXHD6TbWu3RmO4t5oI8tZGqDyEtGSge6jEo/values/C" + row + 
                ":append?valueInputOption=RAW&insertDataOption=OVERWRITE&access_token=" + token, {
                    method: "POST",
                    body: JSON.stringify({
                        "range": "C" + row, //column D for prize pool
                        "majorDimension": "ROWS",
                        "values": [
                            [prize]
                        ]
                    })});
            tickets++; //only increment tickets if one is redeemed
            } //end if
        } //end for
    
    alert("Submitted " + ticketsSpent + " tickets for " + prizeOptions.options[prizeOptions.selectedIndex].text + "!");
    countTickets();
    showPrizePool();
    document.getElementById("number").value = 0;
}

async function getCurrentUser() {
    const token = getToken(); //access token
    const currentUserInfo = await fetch("https://people.googleapis.com/v1/people/me?personFields=names&access_token=" + token)
        .then((response) => response.json())
        .then((json) => JSON.stringify(json));
    const currentUser = JSON.parse(currentUserInfo).names[0].displayName;
    return currentUser;
}

async function showCurrentUser() {
    document.getElementById("currentUser").innerHTML = await getCurrentUser();
}

async function showPrizePool() {
    var spreadsheet = await getData(); //spreadsheet response
    var sheetData = JSON.parse(spreadsheet); //spreadsheet data
    var prizeOptions = document.getElementById("prize");
    var selectedPrize = prizeOptions.value; //user-inputted prize pool
    var totalTickets = 0;

    for (ticket in sheetData.values) {
        if (sheetData.values[ticket][2] == selectedPrize) {
            totalTickets++;
        }
    }

    if (selectedPrize == "") {
        document.getElementById("prizePoolSize").innerHTML = "";
    }
    else {
        document.getElementById("prizePoolSize").innerHTML = "There are currently " + totalTickets + " tickets in the " + prizeOptions.options[prizeOptions.selectedIndex].text.split(" - ")[1] + " drawing";
    }
}

if (window.location.href.indexOf("access_token") == -1) {
    login() //login if access token isn't present
}
