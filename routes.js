const express = require('express');
const router = express.Router();
const database = require('./models');
const mongoose = require('mongoose');

const mongoDB_URL = "mongodb+srv://Admin:Admin@test.xqmisan.mongodb.net/Company?retryWrites=true&w=majority";
mongoose.connect(mongoDB_URL, {useNewUrlParser: true});

router.post("/signup", (req,res) => {
	if(!req.body.email || !req.body.password || !req.body.name)
	{
		res.json({success: false, error: "Enter needed params!"});
		return;
	}
	
	database.Employees.create({
		Name: req.body.name,
		email: req.body.email,
		password: Bcrypt.hashSync(req.body.password, 10),
	}).then((employee) => {
		const token = JsonWebToken.sign({id: employee._id, email: employee.email}, SECRET_JWT_CODE);
		res.json({success: true, token: token});
	}).catch((err) => {
		res.json({success:false, error: err});_
	})
	
});
router.post("/login", (req,res) => {
	if(!req.body.email || !req.body.password){
		res.json({success: false, error: "Enter needed params"});
		return;
	}
	database.Employees.findOne({email: req.body.email}).then((Employees) => {
		if(!Employees){
			res.json({success:false, error:"User does not exist!"});
		} else {
			if(!Bcrypt.compareSync(req.body.password, Employees.password)){
				res.json({success:false, error:"Wrong password"});
			} else {
				const token = JsonWebToken.sign({id: Employees._id, email: Employees._id}, SECRET_JWT_CODE);
				res.json({success: true, token: token});
			}
		}
	}).catch((err) => {
		res.json({success:false, error:err});
	});
});	
	
module.exports = router;
