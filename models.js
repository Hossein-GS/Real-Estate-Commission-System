const mongoose = require('mongoose');

const mongoDB_URL = "mongodb+srv://Admin:Admin@test.xqmisan.mongodb.net/Company?retryWrites=true&w=majority";
mongoose.connect(mongoDB_URL, {useNewUrlParser: true});

const contractSchema = new mongoose.Schema({
  SNo: Number,
  Start_Date: String,
  Source: String,
  Team: String,
  Stage: String,
  First_Name: String,
  Last_Name: String,
  Developer: String,
  Project_Name: String,
  Bedrooms: String,
  Property: String,
  Property_Price: Number,
  Total_Commission: Number,
  Kickback_from_Commission: Number,
  Kickback_from_Commission_AED:{
	type: Number,
	require: false	
  },
  Prime_Agent: {
	  type: String,
	  require: true
  },
  Secondary_Agent1: {
	  type:String,
	  require: false
  },
  Secondary_Agent2: {
	  type:String,
	  require: false
  },
  Secondary_Agent3: {
	  type:String,
	  require: false
  },
  percentage_from_Pot_to_Prime_Agent: Number,
  percentage_from_Pot_to_Secondary_Agent1: {
	  type:Number,
	  require: false
  },
  percentage_from_Pot_to_Secondary_Agent2: {
	  type:Number,
	  require: false
  },
  percentage_from_Pot_to_Secondary_Agent3: {
	  type:Number,
	  require: false
  },
  percentage_to_Apex_from_Prime_Agent: Number,
  percentage_to_Apex_from_Secondary_Agent1: {
	  type:Number,
	  require: false
  },
  percentage_to_Apex_from_Secondary_Agent2: {
	  type:Number,
	  require: false
  },
  percentage_to_Apex_from_Secondary_Agent3: {
	  type:Number,
	  require: false
  },
  percentage_of_Total_Comm_for_Mkt_and_Ent: {
	  type: Number,
	  require:false
  },
  MOU_date: String,
  payment_realised_date: String,
  Agent_payout_Date: String,
  Notes: {
	  type: String,
	  require: false
  },
  Gross_Comm_Amount: Number,
  Kickback_amount: Number,
  Kickback_amount2:Number,
  Gross_Comm_To_Pot: Number,
  Total_Comm_To_Mkt_Ent: Number,
  AED_To_Prime_Agent: Number,
  AED_To_Secondary_Agent1: Number,
  AED_To_Secondary_Agent2: Number,
  AED_To_Secondary_Agent3: Number,
  AED_To_Apex_From_Prime_Agent: Number,
  AED_To_Apex_From_Secondary_Agent1: Number,
  AED_To_Apex_From_Secondary_Agent2: Number,
  AED_To_Apex_From_Secondary_Agent3: Number,
  AED_Net_to_Prime_Agent: Number,
  AED_Net_To_Secondary_Agent1: Number,
  AED_Net_To_Secondary_Agent2: Number,
  AED_Net_To_Secondary_Agent3: Number,
  AED_Net_Total_To_Apex_Comm: Number,
  Other_Payouts: {
	  type: Number,
	  require: false,
  },
}, {collection: "Contracts"});

const employeesSchema = new mongoose.Schema({
	Name: String,
	email: {
		type: String,
		unique: true,
		require: true,
		lowercase: true,
		trim: true
	},
	password: {
		type: String,
		require: true
	},
	position: String,
}, {collection: "Employees"});

const developmentSchema = new mongoose.Schema({
	developer: {
		type: String,
	},
	project: {
		type:Array,
		unique:false,
		require: false,
	},
}, {collection: "Development"});

const teamSchema = new mongoose.Schema({
	team: String
}, {collection: "Team"});

const sourceSchema = new mongoose.Schema({
	source: String
}, {collection: "Source"});

const stageSchema = new mongoose.Schema({
	stage: String
}, {collection: "Stage"});

const property_typeSchema = new mongoose.Schema({
	bedrooms: String
}, {collection: "Property_Type"});

contractSchema.virtual('Start_Date_string').get(function () {
  return this.Start_Date.toDateString();
});

contractSchema.virtual('MOU_date_string').get(function () {
  return this.MOU_date ? this.MOU_date.toDateString() : '';
});

contractSchema.virtual('payment_realised_date_string').get(function () {
  return this.payment_realised_date ? this.payment_realised_date.toDateString() : '';
});

contractSchema.virtual('Agent_payout_Date_string').get(function () {
  return this.Agent_payout_Date ? this.Agent_payout_Date.toDateString() : '';
});


exports.Contracts = mongoose.model('Contract', contractSchema);
exports.Employees = mongoose.model('Employees', employeesSchema);
exports.Development = mongoose.model('Development', developmentSchema);
exports.Team = mongoose.model('Team', teamSchema);
exports.Source = mongoose.model('Source', sourceSchema);
exports.Stage = mongoose.model('Stage', stageSchema);
exports.Property_Type = mongoose.model('Property_Type', property_typeSchema);

