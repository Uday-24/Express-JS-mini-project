const express = require('express');
const app = express();
const userModel = require('./models/user');
const postModel = require('./models/post');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const user = require('./models/user');

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', (req, res) => {
    res.render("index");
});

app.post('/create', async (req, res) => {
    let { username, name, age, email, password } = req.body;
    let user = await userModel.findOne({ email });
    if (user) res.status(500).send("User already exist with this email")
    else {
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(password, salt, async (err, hash) => {
                let user = await userModel.create({
                    username,
                    name,
                    age,
                    email,
                    password: hash
                });

                let token = jwt.sign({ email: email, userid: user._id }, 'shhhh');
                res.cookie("token", token);
                res.redirect('/login');
            });
        });
    }
});

app.get('/login', async (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res)=>{
    let {email, password} = req.body;
    let user = await userModel.findOne({email});

    if(!user) res.status(500).redirect("/login");
    else {
        bcrypt.compare(password, user.password, (err, result)=>{
            if(result){
                let token = jwt.sign({email: email, userid: user._id}, "shhhh");
                res.cookie("token", token);
                res.redirect('/profile');
            }else{
                res.redirect('/login');
            }
        });
    }
});

app.get('/profile', isLoggedIn, async (req, res)=>{
    let user = await userModel.findOne({email: req.user.email}).populate('posts');
    res.render('profile', {user});
});

app.get('/like/:id', isLoggedIn, async (req, res)=>{
    let id = req.params.id;
    let post = await postModel.findOne({_id: id}).populate('user');

    if(post.likes.indexOf(req.user.userid) === -1){
        post.likes.push(req.user.userid);
    }else{
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }

    await post.save();
    res.redirect('/profile');
});

app.post('/post', isLoggedIn, async (req, res)=>{
    let user = await userModel.findOne({email: req.user.email});
    let content = req.body.content;
    let post = await postModel.create({
        user: user._id,
        content
    });
    user.posts.push(post._id);
    await user.save();
    res.redirect('/profile');
});

app.get('/edit/:id', isLoggedIn, async (req, res)=>{
    let id = req.params.id;
    let post = await postModel.findOne({_id: id});
    res.render('edit', {post});
});

app.post('/edit/:id', isLoggedIn, async (req, res)=>{
    let id = req.params.id;
    await postModel.findOneAndUpdate({_id: id}, {content: req.body.content});
    res.redirect('/profile');
});

function isLoggedIn(req, res, next){
    let token = req.cookies.token;
    if(!token){
        res.redirect('/login');
    }else{
        let data = jwt.verify(token, 'shhhh');
        req.user = data;
        next();
    }
}

app.listen(3000);