// const jwt = require('json-web-token');
const jwt = require('jsonwebtoken');

let users = {
    john: {password: "passwordjohn"},
    mary: {password:"passwordmary"}
}

let currentUser;
let tokenRefreshed = false;

exports.login = function(req, res){

    let username = req.body.username
    let password = req.body.password
    
    // Neither do this!
    if (!username || !password || users[username].password !== password){
        return res.status(401).send()
    }

    //use the payload to store information about the user such as username, user role, etc.
    let payload = {username: username};

    currentUser = username;

    //create the access token with the shorter lifespan
    let accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
        algorithm: "HS256",
        expiresIn: `${process.env.ACCESS_TOKEN_LIFE}s`
    });

    console.log("access token expiresIn: ", process.env.ACCESS_TOKEN_LIFE);

    //create the refresh token with the longer lifespan
    let refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
        algorithm: "HS256",
        expiresIn: `${process.env.REFRESH_TOKEN_LIFE}s`
    });

    console.log("refresh token expiresIn: ", process.env.REFRESH_TOKEN_LIFE);

    //store the refresh token in the user array
    users[username].refreshToken = refreshToken;

    //send the access token to the client inside a cookie
    res.cookie("jwt", accessToken, {secure: true, httpOnly: true})
    res.send();
    
    // res.status(200).send({
    //     message: "status ok",
    //     accessToken,
    //     refreshToken
    // });
}

exports.refresh = function (req, res, next){
    if(!tokenRefreshed) {
        next();
        return;
    }
    let accessToken = req.cookies.jwt;
    let accessTokenTemp;
    let accessTokenAux;
    if(!accessToken) {
        accessTokenTemp = (req.headers['access-token'] || req.headers['authorization']);
        if(accessTokenTemp) {
            accessTokenAux = accessTokenTemp.replace("Bearer", "").trim();
        }
        
    }
    console.log("req.cookies", JSON.stringify(req.cookies));
    console.log("req.cookies.jwt", req.cookies.jwt);

    if (!accessToken && !accessTokenAux){
        console.log("Access token missed");
        return res.status(403).send({
            error: "Access token missed"
        })
    }

    let payload;
    let token = accessToken || accessTokenAux;

    try{
        console.log("accessToken", accessToken);
        console.log("process.env.ACCESS_TOKEN_SECRET", process.env.ACCESS_TOKEN_SECRET);
        console.log("token", token);
        payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log(payload ? payload : "Payload missed");
     }
    catch(e){
        // return res.status(401).send({
        //     error: e.message === "jwt expired" ? "Accesstoken expired" : "Access token not valid"
        // });

        if(e.message === "jwt expired") {
            //retrieve the refresh token from the users array
            // let refreshToken = users[payload.username].refreshToken || currentUser.refreshToken;
            if(!users[currentUser]) {
                res.status(401).send({
                    error: "Unknown user, please log in at this path /login"
                });
            }

            let refreshToken = users[currentUser].refreshToken;
            console.log("currentUser", currentUser);
            console.log("refreshToken", refreshToken);

            //verify the refresh token
            try{
                console.log("token", token);
                console.log("process.env.ACCESS_TOKEN_SECRET", process.env.REFRESH_TOKEN_SECRET);
                // payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
                jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
            }
            catch(e){
                // return res.status(401).send({
                //     error: e.message === "jwt expired" ? "Refresh expired" : "Refresh token not valid",
                //     e
                // })
                if(e.message === "jwt expired") {
                    let newToken = jwt.sign({currentUser}, process.env.ACCESS_TOKEN_SECRET,
                        {
                            algorithm: "HS256",
                            expiresIn: `${process.env.ACCESS_TOKEN_LIFE}s`
                        })
            
                        if (newToken) {
                            console.log("newToken", newToken);
                        } else {
                            console.log("New token couldnt been generated");
                        }
            
                        res.cookie("jwt", newToken, {secure: true, httpOnly: true});
                        next();
                }
            }

            // let newToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, 
            // let newToken = jwt.sign({currentUser}, process.env.ACCESS_TOKEN_SECRET,
            // {
            //     algorithm: "HS256",
            //     expiresIn: `${process.env.ACCESS_TOKEN_LIFE}s`
            // })

            // if (newToken) {
            //     console.log("newToken", newToken);
            // } else {
            //     console.log("New token couldnt been generated");
            // }

            // res.cookie("jwt", newToken, {secure: true, httpOnly: true});
            // next();
            // res.send();

            // res.status(200).send({
            //     message: "status ok",
            //     newToken,
            //     refreshToken
            // });
        }
    }
}

exports.verify = function(req, res, next){
	let accessToken = req.cookies.jwt;
    // console.log("token a traves de cookie: ", req.cookies.jwt);
    let accessTokenTemp;
    let accessTokenAux;
    if(!accessToken) {
        accessTokenTemp = (req.headers['access-token'] || req.headers['authorization']);
        if(accessTokenTemp) {
            accessTokenAux = accessTokenTemp.replace("Bearer", "").trim();
        }
        
    }

    //if there is no token stored in cookies, the request is unauthorized
    if (!accessToken && !accessTokenAux){
        return res.status(403).send({
			error: "No token found, if you dont have one, visit /login to get it"
		});
    }

    let payload;
    let token = accessToken || accessTokenAux;
    try{
        //use the jwt.verify method to verify the access token
        //throws an error if the token has expired or has a invalid signature
		
        // console.log("process.env.ACCESS_TOKEN_SECRET", process.env.ACCESS_TOKEN_SECRET);
        // console.log("token", token);
        payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log("payload", payload);
		console.log("payloadStringify", JSON.stringify(payload));
        tokenRefreshed = false;
        next();
    }
    catch(e){
        //if an error occured return request unauthorized error
        // return res.status(401).send({
		// 	error: "Unauthorized",
        //     e
		// });
        tokenRefreshed = true;
        next();
    }
}