const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const BUCKET_NAME = process.env.BUCKET_NAME;

exports.handler = async (event) => {
    try {
        // Get the S3 event
        const s3Event = event.Records[0].s3;
        const newDumpKey = decodeURIComponent(s3Event.object.key.replace(/\+/g, ' '));
        const masterKey = 'master/pets.json';

        // Fetch the new data dump from S3.
        const newDumpData = await s3.getObject({ Bucket: BUCKET_NAME, Key: newDumpKey }).promise();
        const newPets = JSON.parse(newDumpData.Body.toString());

        // Fetch the master list from S3.
        let masterPets = [];
        try {
            const masterData = await s3.getObject({ Bucket: BUCKET_NAME, Key: masterKey }).promise();
            masterPets = JSON.parse(masterData.Body.toString());
        } catch (err) {
            if (err.code === 'NoSuchKey') {
                console.log('Master list does not exist. Creating a new one.');
            } else {
                throw err;
            }
        }

        // Remove pets from master list if they don't show up in the dump.
        // This removes pets from our list when they are removed from the website.
        masterPets = masterPets.filter(masterPet =>
            newPets.some(newPet => newPet.id === masterPet.id)
        );

        // Filter out pets already in the master list.
        const netNewPets = newPets.filter(newPet =>
            !masterPets.some(masterPet => masterPet.id === newPet.id)
        );

        // If there are net new pets, update the master list.
        if (netNewPets.length > 0) {
            const updatedMasterList = [...netNewPets, ...masterPets];

            // Upload the updated master list to S3
            await s3.putObject({
                Bucket: BUCKET_NAME,
                Key: masterKey,
                Body: JSON.stringify(updatedMasterList),
                ContentType: 'application/json'
            }).promise();

            console.log(`Master list updated. ${netNewPets.length} new pets added.`);
        } else {
            console.log('No new pets found. Master list not updated.');
        }

    } catch (error) {
        console.error('Error processing the deduplication:', error);
        throw error;
    }
};
