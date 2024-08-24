const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const ses = new AWS.SES();
const BUCKET_NAME = process.env.BUCKET_NAME;
const EMAIL_ADDRESS = process.env.EMAIL_ADDRESS;

exports.handler = async (event) => {
    try {
        // Get the S3 event and the updated master list key
        const s3Event = event.Records[0].s3;
        const masterKey = decodeURIComponent(s3Event.object.key.replace(/\+/g, ' '));

        // Fetch the updated master list from S3
        const masterData = await s3.getObject({ Bucket: BUCKET_NAME, Key: masterKey }).promise();
        const masterPets = JSON.parse(masterData.Body.toString());

        // Prepare email content in HTML
        let emailBody = `
      <html>
        <body>
          <h2>Updated Pet List</h2>
          <ul style="list-style-type:none; padding:0;">
    `;

        masterPets.forEach(pet => {
            emailBody += `
        <li style="margin-bottom: 20px;">
          <img src="${pet.imageUrl}" alt="${pet.name}" style="width:200px;height:auto;display:block;margin-bottom:10px;">
          <strong>Name:</strong> ${pet.name}<br>
          <strong>ID:</strong> ${pet.id}<br>
          <strong>Breed:</strong> ${pet.breed}<br>
          <strong>Gender:</strong> ${pet.gender}<br>
          <strong>Age/Weight:</strong> ${pet.ageWeight}<br>
          <strong>Color:</strong> ${pet.color}<br>
          <strong>Location:</strong> ${pet.location}<br>
          <a href="${pet.detailsUrl}">View Details</a>
        </li>
      `;
        });

        emailBody += `
          </ul>
        </body>
      </html>
    `;

        // Send email using SES
        const params = {
            Destination: {
                ToAddresses: [EMAIL_ADDRESS],
            },
            Message: {
                Body: {
                    Html: { Data: emailBody },
                },
                Subject: { Data: "Updated Pet List" },
            },
            Source: EMAIL_ADDRESS,
        };

        await ses.sendEmail(params).promise();
        console.log('HTML email sent successfully');

    } catch (error) {
        console.error('Error in sending email:', error);
        throw error;
    }
};
