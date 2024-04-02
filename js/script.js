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
                ":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS&access_token=" + token, {
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

    var feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec;
    feb = mar = apr = may = jun = jul = aug = sep = oct = nov = dec = 0;

    for (ticket in sheetData.values) {
        if (sheetData.values[ticket][1] == user) {
            if (sheetData.values[ticket].length <= 2) {
                availableTix++;
            }
            else {
                switch (sheetData.values[ticket][2]) {
                    case "FEB":
                        feb++;
                        break;
                    case "MAR":
                        mar++;
                        break;
                    case "APR":
                        apr++;
                        break;
                    case "MAY":
                        may++;
                        break;
                    case "JUN":
                        jun++;
                        break;
                    case "JUL":
                        jul++;
                        break;
                    case "AUG":
                        aug++;
                        break;
                    case "SEP":
                        sep++;
                        break;
                    case "OCT":
                        oct++;
                        break;
                    case "NOV":
                        nov++;
                        break;
                    case "DEC":
                        dec++;
                        break;
                }
            }
        }
    }

    var tixSummary = "You have " + availableTix + " available tickets";

    /*if (feb > 0) */tixSummary.concat("<br>", feb + " tickets in the February drawing");
    /*if (mar > 0) */tixSummary.concat("<br>", mar + " tickets in the March drawing");
    /*if (apr > 0) */tixSummary.concat("<br>", apr + " tickets in the April drawing");
    /*if (may > 0) */tixSummary.concat("<br>", may + " tickets in the May drawing");
    /*if (jun > 0) */tixSummary.concat("<br>", jun + " tickets in the June drawing");
    /*if (jul > 0) */tixSummary.concat("<br>", jul + " tickets in the July drawing");
    /*if (aug > 0) */tixSummary.concat("<br>", aug + " tickets in the August drawing");
    /*if (sep > 0) */tixSummary.concat("<br>", sep + " tickets in the September drawing");
    /*if (oct > 0) */tixSummary.concat("<br>", oct + " tickets in the October drawing");
    /*if (nov > 0) */tixSummary.concat("<br>", nov + " tickets in the November drawing");
    /*if (dec > 0) */tixSummary.concat("<br>", dec + " tickets in the december drawing");

    document.getElementById("availableTix").innerHTML = tixSummary;
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
    
    if (prize == "") {
        alert("Select a prize first!");
        return;
    }
    
    if (!confirm("Submit " + ticketsSpent + " tickets for " + prizeOptions.options[prizeOptions.selectedIndex].text + "?")) {
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
