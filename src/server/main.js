const fs = require("fs")
const http = require('http');
const { url } = require("inspector");
const fetch = require("isomorphic-fetch")
const readline = require("readline").createInterface(
  {
    input:process.stdin,
    output:process.stdout
  }
)
/*
example question:
readline.question("Query",(answer) => {
  console.log("wow!")
  readline.close()
})
*/
var htmls = {}
var users = {}
var commands = {}
var launchinfo = null
async function loadLaunchInfo() {
  await fs.readFile("./src/multi-instance_data/launchinfo.json",(err,data) => {
    if(err) return console.log(err)
    launchinfo = JSON.parse(data)
    return
  })
  return
}
function getRndInteger(min, max) {
  //stolen from w3schools cus im lazy lol
  return Math.floor(Math.random() * (max - min) ) + min;
}
function random32BitInteger() {
  return getRndInteger(0,4294967296)
}
async function loadHtmls(endCallback) {
  htmls = {"info":{}}
  await fs.readFile("src/client/referenceIDs.json",async (err,data) => {
    if(err) return console.log(err);
    jsonInfo = JSON.parse(data)
    htmls["all"] = jsonInfo.all
    if(jsonInfo.all.length>0) await gethtml(0,jsonInfo,endCallback)
  })
}
async function gethtml(index,jsonInfo,endCallback) {
  await fs.readFile(jsonInfo.info[jsonInfo.all[index]].href,"utf8",(err,data) => {
    if(err) return console.log(err)
    id = jsonInfo.all[index]
    var output = jsonInfo.info[id]
    output.data = data
    htmls["info"][id] = output
  })
  if(index < jsonInfo.all.length-1) gethtml(index+1,jsonInfo,endCallback)
  else endCallback()
}
async function loadUserData() {
  users = {}
  await fs.readFile("./src/multi-instance_data/users.json","utf8",(err,data) => {
    if(err) return console.log(err)
    jsonInfo = JSON.parse(data)
    const userdata = jsonInfo
    return
  })
  return
}
function exit() {
  process.exit()
}
/*process.on("uncaughtException",(err,origin) => {
  console.error(err)
  console.log("Encountered uncaught error. Closing all connections. Only connections currently pending will be affected.")
  for(var conn in activeRequests) {
  }
})*/
class connection {
  constructor(req,res) {
    this.request = req;this.response = res;this.date = new Date();
    connection.connections.push(this)
  }
  close() {
    this.response.end()
    for(var i = 0;i < connection.connections.length;i++) {
      if(connection.connections[i] === this) connection.connections.splice(i,1);
    }
  }
  static connections = []
  static newConnectionsAllowed = true
  static clear() {
    
    if(connection.connections.length === 0) connection.connections = []
    else {
      connection.newConnectionsAllowed = false
      for(var i = 0;i < connection.connections.length;i++) {
        connection.connections[i].response.end()
        if(i = connection.connections.length - 1) {
          connection.connections = []
        }
      }
      connection.newConnectionsAllowed = true
    }
    
  }
}
class token {
  constructor(USERNAME,TOKEN,addToList) {
    this.USERNAME = USERNAME;this.TOKEN = TOKEN
    this.expireDate = new Date();
    this.expireDate.setDate(this.expireDate.getDate()+1)
    if(addToList) token.activeTokenList.push(this)
  }
  static activeTokenList = []
  static isActive(username,tokenID) {
    var now = new Date()
    for(var i = 0; i<this.activeTokenList.length;i++) {
      var tkn = this.activeTokenList[i]
      if(tkn.USERNAME === username && tkn.TOKEN === tokenID) {
        if(tkn.expireDate>now) {
          return true
        }
        else {
          token.activeTokenList.splice(i,1)
          return false
        }
      }
    }
    return false
  }
  static generateToken(username) {
    var toBeRemoved = []
    for(var i = this.activeTokenList.length-1;i>=0;i--) {
      if(this.activeTokenList[i].USERNAME===username) {
        toBeRemoved.push(i)
      }
    }
    for(var i = 0; i<toBeRemoved.length,i++;) {
      this.activeTokenList.splice(i,1)
    }
    return new token(username,random32BitInteger(),true)
  }
}
async function readAddons() {
  await fs.readFile("./src/addons/order.json",(err,data) => {
    var jsonData = JSON.parse(data)
    commands = jsonData
    return
  })
  return
}
function startServer(port) {
  console.log(port.toString())
  const server =  http.createServer(
    (req,res) => {
      var body = ""
      var headers = req.headers
      var activated = false
      var failed = false
      req.addListener("error",function(error) {console.log(error);req.destroy((error)=>{console.log(error);res.end();return;});return;})
      //req.addListener("pause",function() {req.destroy((error)=>{console.log(error);return;});res.end();return;})
      //req.addListener("resume",function() {req.destroy((error)=>{console.log(error);return;});res.end();return;})
      //req.addListener("close",function() {return})
      req.addListener("data",(chunk)=>{if(!failed){body+=chunk}})
      req.addListener("end",() => {
        if(req.url === "/") var Url = ""
        else {
          var Url = req.url.slice(1)
          if(Url.slice(-1) === "/") Url.slice(-1)
        }
        console.log(Url)
        activated = true
        var failed = false
        var headers = req.headers
        setTimeout(()=> {
          if(!activated) {
            res.end()
            console.log("Timed out on request.")
            req.destroy((error)=>{console.log(error);return;})
            failed = true
            body = ""
            return
          }
        },10000)
        var jsonData
        if(body) {
        try {
          jsonData = JSON.parse(body) 
        }
        catch(e) {console.log(e);res.end();req.destroy();return;failed=true}
        if(failed) {console.log("failed");return};
        }
        else if(req.method==="GET"){
          var success = false;
          console.log(JSON.stringify(htmls))
          Object.entries(htmls.info).forEach((key,value) => {
            console.log("\n\n\nKey: "+JSON.stringify(key[1]))
            var item = key[1]
            for(var i = 0;i<item.urls.length;i++) {
              console.log(item.urls[i])
            }
            
            for(var i = 0;i<item.urls.length;i++) {
              console.log(item.urls[i])
              if(item.urls[i].toLowerCase() === Url.toLowerCase()) {
                console.log("Success! "+key[1])
                res.writeHead(200,{"Content-Type":"text/html"})
                res.write(item.data)
                res.end()
                success = true
                break
              }else {console.log("Failed: "+item.urls[i].toLowerCase())}
            }
            if(!success) {
              console.log("Failed :(")
              res.end()
            }
          })
        }
      }
    )
  })
  server.listen(port,(error) => {
    if(error) {console.log(error)}
    else{console.log("Server successfully started and hosted on port "+toString(port))}
  })
}
async function main2() {
  console.log("starting")
  await loadLaunchInfo()
  //await loadUserData()
  console.log("hi") 
  setTimeout(async () => {
  await readAddons()
  if(typeof(launchinfo.PORT)==="number") { 
    await startServer(launchinfo.PORT)
  }
  else {
    console.log("Unsupported port type: "+typeof(launchinfo.PORT)+".\nClosing program.")
    exit()
  }
  loadHtmls( () => {
    console.log(JSON.stringify(htmls))
  })
  console.log("almost done")
},5000)
}
async function main() {
  console.log("starting")
  loadLaunchInfo()
  setTimeout(() => {
    console.log("Retrieved start settings")
    readAddons()
    if(typeof(launchinfo.PORT)==="number") {startServer(12055);console.log("attempting to start server")}
    else {
      console.log("Unsupported port type: "+typeof(launchinfo.PORT)+".\nClosing program.")
      exit()
    }
    setTimeout(() => {
      loadHtmls(() => {
        setTimeout(() => {
        },5000)
      })
    },5000)
  },5000)
}
main()