require('dotenv').config();

//Load Library 
const express = require('express');
const mysql =  require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(bodyParser.json({limit: '50mb'}));

const APP_PORT = process.env.APP_PORT;
const AWS_S3_HOST_NAME = process.env.AWS_S3_HOST_NAME;
const AWS_S3_ACCESS_KEY = process.env.AWS_S3_ACCESS_KEY;
const AWS_S3_SECRET_ACCESSKEY = process.env.AWS_S3_SECRET_ACCESSKEY;
const AWS_S3_BUCKETNAME = process.env.AWS_S3_BUCKETNAME;
AWS.config.credentials = new AWS.SharedIniFileCredentials('default');

const spaceEndPoint = new AWS.Endpoint(AWS_S3_HOST_NAME);

const s3 = new AWS.S3({
    endpoint: spaceEndPoint
    // accessKeyId: AWS_S3_ACCESS_KEY,
    // secretAccessKey: AWS_S3_SECRET_ACCESSKEY
})

const upload = multer({ 
    storage: multerS3({
        s3: s3,
        bucket: AWS_S3_BUCKETNAME,
        acl: 'public-read',
        metadata: function(req, file, cb) {
            cb(null, {
                fileName: file.fieldname,
                originalFilename: file.originalname,
                uploadDatetime: new Date().toString(),
                uploader: req.body.uploader ? req.body.uploader : req.query.uploader,
                note: req.body.note ? req.body.note : req.query.note,
                type: req.body.type ? req.body.type : '',
                size: req.body.size ? req.body.size : ''
            })
        },
        key: function(request, file, cb) {
            cb(null, new Date().getTime() + '_' + file.originalname )
        }
    })
// }).array('upload', 1);
}).single('image-file');

app.post('/upload', (req, res)=> {
    upload(req, res, (error) => {
        if(error)
        {
            console.log(error);
            return res.status(500).json(error.message);
        }
        console.log('file successfully uploaded');
        res.status(200).json({ 
            message: 'uploaded',
            res_image: res.req.file.location,
            res_image_key: res.req.file.key
        });
    })
})

// app.post('/upload2', multer.single('img-file'), (req, res)=> {
//     upload(req, res, (error) => {
//         if(error)
//         {
//             console.log(error);
//             return res.status(500).json(error.message);
//         }
//         console.iog('file successfully uploaded');
//         res.status(200).json({ message: 'uploaded' });
//     })
// })
function encode(data){
    let buf = Buffer.from(data);
    let base64 = buf.toString('base64');
    return base64
}

async function downloadFromS3(params, res) {
    const metaData = await s3.headObject(params).promise();

    let mimes = {
        'jpeg': 'data:image/jpeg;base64,'
    };

    res.set({
        'X-Original-Name': metaData.Metadata.originalfilename,
        'X-Create-Time': metaData.Metadata.uploadDatetime,
        'X-Uploader': metaData.Metadata.uploader,
        'X-Notes': metaData.Metadata.note
    })
    s3.getObject(params, (err, data) => {
        if(err)
            console.log(err, err.stack);
        let result = 'data:image/jpeg;base64,' + encode(data.Body);
        // let image="<img src='data:image/jpeg;base64," + encode(data.Body) + "'" + "/>";
        // let startHTML="<html><body></body>";
        // let endHTML="</body></html>";
        // let html=startHTML + image + endHTML;
        // res.send(html)
        res.status(200).json({ res_image: result });
    })
}

app.get('/blob/:key', (req, res) => {
    const params = {
        Bucket: AWS_S3_BUCKETNAME,
        Key: req.params.key
    }

    //Download from S3
    downloadFromS3(params, res);
})

app.listen(APP_PORT, ()=> {
    console.info(`Server Started on PORT ${APP_PORT} at ${new Date()}`);
})