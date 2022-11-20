const express = require("express");
const res = require("express/lib/response");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");
const { group } = require("console");
const mongoClient = require("mongodb").MongoClient
const app = express()
const port = process.env.port | 9000;

//const mongourl = "mongodb://localhost:27017"
const mongourl = process.env.MONGOURI
const dbName = "quizAppDB"
const usersCol = "usersCol";
const testsCol = "testsCol";
const groupsCol = "groupsCol"
const usersFileURL = "./data/users.json"
const testsFileURL = "./data/tests.json"
const groupsFileURL = "./data/groups.json"

// Drop database and create a new one with the available JSON. Or check with actual update function lol


app.use(cors())
app.use(bodyParser.urlencoded({extended:false}))
app.use(bodyParser.json())
var users;
var tests;
var groups;

var loadDataAsyncPromise = (url) => {
    return new Promise((resolve, reject)=>{
        fs.readFile(url, (err, data)=>{
            if(err) reject(err);
            else resolve(data);
        })
    })
}

var init = () =>{
    console.log("init")

    mongoClient.connect(mongourl)
        .then((db)=>{
            var userDB = db.db(dbName);
            userDB.collection(usersCol).find({}).toArray().then((res) => {
                let temp_users = res;
                userDB.collection(testsCol).find({}).toArray().then((res2) => {
                    let temp_tests = res2;
                    users = {users: temp_users}
                    tests = {tests: temp_tests}
                    //console.log(users, tests);
                    userDB.collection(groupsCol).find({}).toArray()
                        .then((res)=>{
                            groups = {groups: res};
                            syncData();
                            start_app();
                            
                        })
                })
            })
        })
        .catch(err=>console.log(err));
    
    
}

var start_app = () =>{
    console.log("start")
    //console.log(groups.groups[2].tests, users.users.find(ele=>ele.group=="C").tests)
    app.get('/getUser/', (req, res) => {
        //console.log(users)
        loadDataAsyncPromise(usersFileURL)
            .then((data)=>{users = JSON.parse(data.toString())})
            .then(()=>{res.json(users);res.end()})
            .catch((err)=>console.log(err));
        
    })
    
    app.get('/getTests/', (req, res) => {
        loadDataAsyncPromise(testsFileURL)
            .then((data)=>{tests = JSON.parse(data.toString())})
            .then(()=>{res.json(tests);res.end()})
            .catch((err)=>console.log(err));
    })
    
    app.post('/updateTest', (req, res)=>{
        let uData = req.body;
        var i;
        //console.log(uData.user.username, users.users)
        let test = users.users
            .find(ele=>ele.username==uData.user.username).tests
            .find(ele=>ele.id==uData.test)
        for(i=0; i<users.length; i++){
            if(uData.user.username == users[i].username){
                break;uData
            }
        }
        var j;
        for(j=0; j<uData.user.tests.length; j++){
            if(uData.user.tests[j].id == uData.test){
                break;
            }
        }
        //console.log(uData, test)
        test.completed = true;
        test.score = uData.score;
        fs.writeFile("./data/users.json", JSON.stringify(users), (err) => {
            if(err) console.error(err);
        })
        res.end()
    })

    app.get('/updateDBQ', (req, res)=>{
        var response = res;
        mongoClient.connect(mongourl)
            .then((db)=>{
                var database = db.db(dbName);
                database.collection(usersCol).drop()
                    .then((res)=>{
                        database.collection(usersCol).insertMany(users.users).then(()=>{response.end()})
                    })
            })
            .catch(err=>console.error(err));
    })

    app.get('/updateDBT', (req, res)=>{
        var response = res
        loadDataAsyncPromise(testsFileURL)
            .then((res=>{tests = JSON.parse(res.toString())}))
            .then(()=>{
                mongoClient.connect(mongourl)
                    .then((db)=>{
                        var database = db.db(dbName);
                        database.collection(testsCol).drop()
                            .then(()=>{
                                database.collection(testsCol).insertMany(tests.tests).then(()=>{response.end()})
                            })
                    })
            })

    })

    app.get('/updateDBG', (req, res)=>{
        var response = res
        loadDataAsyncPromise(groupsFileURL)
            .then((res=>{groups = JSON.parse(res.toString())}))
            .then(()=>{
                mongoClient.connect(mongourl)
                    .then((db)=>{
                        var database = db.db(dbName);
                        database.collection(groupsCol).drop()
                            .then(()=>{
                                database.collection(groupsCol).insertMany(groups.groups).then(()=>{response.end()})
                            })
                    })
            })

    })

    app.get('/syncData', (req, res)=>{
        syncData(res);
    })

    app.listen(port, () => {
        console.log(`Express listening at ${port}`)
    })
}

var syncData = (res)=>{
    let response = res;
    loadDataAsyncPromise(groupsFileURL)
        .then(res=>{
            groups = JSON.parse(res)
        })
        .then(()=>{
            for(i of users.users){
                let g = groups.groups.find(ele=>ele.name == i.group).tests;
                let temp = [];
                for(j of g){
                    let pr=i.tests.find(ele=>ele.id==j)
                    if(pr){
                        temp.push(pr);
                    }
                    else{
                        let t = {
                            id: j,
                            completed: false,
                            score: 0,
                            duration: tests.tests.find(ele=>ele.id==j).duration
                        }
                        temp.push(t);
                    }   
                }
                i.tests = temp;
            }
        }).then(()=>{
            fs.writeFile("./data/users.json", JSON.stringify(users), (err) => {
                if(err) console.error(err);
            })
            if(response) response.end()
        })
}

// loadDataAsyncPromise(groupsFileURL)
//     .then((res=>{groups = JSON.parse(res.toString())}))
//     // .then(()=>{
//     //     mongoClient.connect(mongourl)
//     //         .then((db)=>{
//     //             var database = db.db(dbName);
//     //             database.collection(testsCol).drop()
//     //                 .then(()=>{
//     //                     database.collection(testsCol).insertMany(tests.tests)
//     //                 })
//     //         })
//     // })
//     .then(res=>{
//         mongoClient.connect(mongourl).then(db=>{
//             let database = db.db(dbName);
//             database.collection(groupsCol).insertMany(groups.groups)  
//         })
//     })

init()

//start_app()