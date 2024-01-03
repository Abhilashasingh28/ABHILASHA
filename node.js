const fs = require('fs');
const { google } = require('googleapis');
const readline = require('readline');
const { googleAuth } = require('google-auth-library');

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

// Function to authorize and get OAuth2 client
async function authorize() {
  const credentials = JSON.parse(fs.readFileSync('new_credentials.json'));
  console.log('Authorize this app by visiting this URL:', credentials);
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, "http://localhost:3000");

  try {
    const token = JSON.parse(fs.readFileSync('token.json'));
    oAuth2Client.setCredentials(
      {
        access_token: token?.data?.access_token
      
      }
    );


    // // if (oAuth2Client.isTokenExpiring()) {
    //   console.log('Token is expired. Refreshing...');
    //   await refreshAccessToken(oAuth2Client);
    // // }

    //console.log(token);
    //console.log(token?.data?.access_token)
    return oAuth2Client;
  } catch (err) {
    console.log(err)
    return getAccessToken(oAuth2Client);
  }
}

// Function to refresh access token using refresh token
async function refreshAccessToken(oAuth2Client) {
  try {
    const token = JSON.parse(fs.readFileSync('token.json'));

    oAuth2Client.setCredentials({
      refresh_token: token?.data?.refresh_token,
    });

    const newToken = await oAuth2Client.getAccessToken();
    oAuth2Client.setCredentials(newToken);

    // Save the new token to disk
    fs.writeFileSync('token.json', JSON.stringify(newToken));

    console.log('Token refreshed successfully.');
  } catch (error) {
    console.error('Error refreshing token:', error.message);
    throw error;
  }
}


// Function to get access token
async function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this URL:', authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const code = await new Promise((resolve) => {
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      resolve(code);
    });
  });

  const token = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(
    {
      access_token: token.tokens.access_token
    
    }
  );
  console.log(token.tokens.access_token)
  console.log(token);

  // Save the token to disk for subsequent program executions
  fs.writeFileSync('token.json', JSON.stringify(token));

  return oAuth2Client;
}

// // Function to check for new emails
// async function checkForNewEmails(auth) {
//   const gmail = google.gmail({ version: 'v1', auth });
//   console.log('checkForNew emails:', gmail);
//   // Implement logic to check for new emails

  // Function to check for new emails
async function checkForNewEmails(auth) {
    const gmail = google.gmail({ version: 'v1', auth });
    
    try {
      // Use the Gmail API to list messages in the Inbox
      const response = await gmail.users.messages.list({
        userId: 'sachin.kumar@masaischool.com',
        labelIds: ['INBOX'], // Use the label you want to check (e.g., 'INBOX', 'UNREAD', etc.)
      });
       console.log(response);
      const messages = response.data.messages;
      
      if (!messages || messages.length === 0) {
        console.log('No new emails found.');
        return null;
      }
  
      // Assuming you want to check the first message, you can modify this logic
      const emailId = messages[0].id;
      console.log(messages[0])
      console.log('New email found:', emailId);
      return emailId;
    } catch (error) {
      console.error('Error checking for new emails:', error.message);
      return null;
    }
    // Use the Gmail API to list messages and check if they have been replied to
  }
  

// Function to send replies to emails
// async function sendReplies(auth, emailId) {
//   const gmail = google.gmail({ version: 'v1', auth });
//   console.log('Retrieved emails:', gmail,emailId);
//   // Implement logic to send replies to emails that meet the criteria
// Function to send replies to emails
async function sendReplies(auth, emailId) {
  const gmail = google.gmail({ version: 'v1', auth });
  
  try {
    // Get the details of the selected email
    const emailDetails = await gmail.users.messages.get({
      userId: 'sachin.kumar@masaischool.com',
      id: emailId,
    });

    // Extract relevant information such as subject, sender, etc.
    const subject = emailDetails.data.payload.headers.find(header => header.name === 'Subject').value;
    const sender = emailDetails.data.payload.headers.find(header => header.name === 'From').value;

    // Check if there are any prior sent emails in the thread
    const priorSentEmails = await gmail.users.messages.list({
      userId: 'sachin.kumar@masaischool.com',
      q: `from:me to:${sender} subject:"${subject}"`,
    });

    if (!priorSentEmails.data.messages || priorSentEmails.data.messages.length === 0) {
      // No prior sent emails in the thread, send a reply
      console.log('Replied to email:', emailId);

      // Example: Send a reply using the Gmail API
      const response = await gmail.users.messages.send({
        userId: 'sachin.kumar@masaischool.com',
        resource: {
          raw:  Buffer.from(
            `To: ${sender}\r\n` +
            `Subject: Re: ${subject}\r\n\r\n` +
            'Your email content here'
          ).toString('base64'),
        },
      });

    } else {
      // Prior sent emails found, skip replying
     console.log('Skip replying to email:', emailId);
    }

  } catch (error) {
    console.error('Error sending replies:', error.message);
  }
}

// // Function to add label and move email
// async function addLabelAndMove(auth, emailId, labelName) {
//   const gmail = google.gmail({ version: 'v1', auth });
//   console.log('Added label and moved email:',gmail, emailId);

  // Implement logic to add a label to the email and move it

// Function to add label and move email
async function addLabelAndMove(auth, emailId, labelName) {
  const gmail = google.gmail({ version: 'v1', auth });

  try {
    // Check if the label exists
    const labels = await gmail.users.labels.list({
      userId: 'sachin.kumar@masaischool.com',
    });

    const existingLabel = labels.data.labels.find(label => label.name === labelName);

    if (!existingLabel) {
      // Label does not exist, create it
      const newLabel = await gmail.users.labels.create({
        userId: 'sachin.kumar@masaischool.com',
        resource: {
          name: labelName,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
        },
      });

      console.log(`Created new label: ${labelName}`);

      // Use the new label
      await gmail.users.messages.modify({
        userId: 'sachin.kumar@masaischool.com',
        id: emailId,
        resource: {
          addLabelIds: [newLabel.data.id],
        },
      });

    } else {
      // Label exists, use it
      await gmail.users.messages.modify({
        userId: 'sachin.kumar@masaischool.com',
        id: emailId,
        resource: {
          addLabelIds: [existingLabel.id],
        },
      });

      console.log(`Added label '${labelName}' to email:`, emailId);
    }

  } catch (error) {
    console.error('Error adding label and moving email:', error.message);
  }
}


// Function to repeat the sequence in random intervals
async function repeatSequence(auth) {
  while (true) {
    //const randomInterval = 2000
    const randomInterval = Math.floor(Math.random() * (120000 - 45000 + 1)) + 45000; // Random interval between 45 to 120 seconds
    console.log(randomInterval);
    await new Promise((resolve) => setTimeout(resolve, randomInterval));

    // Implement the sequence of steps 1-3
    const emailId = await checkForNewEmails(auth);
    if (emailId) {
        console.log(emailId);
      await sendReplies(auth, emailId);
      await addLabelAndMove(auth, emailId, 'YourLabelName');
    }
  }
}

// Main function to run the app
async function main() {
  const auth = await authorize();
  await repeatSequence(auth);
}

// Run the app
main();
