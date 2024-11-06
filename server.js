//Admin email: admin@test.Com
//Admin password: Admin123
//J28Hsdri@*djslxoa18h
const express = require('express');
const JsonWebToken = require('jsonwebtoken');
const BodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const Bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const cors = require('cors');
const database = require('./models');
const helmet = require('helmet');
const env = require('dotenv').config();
var selectedEmployees;
var selectedDevelopers;
var selectedTeams;
var selectedStages;
var selectedSources;
var selectedProperty_types;
var selectedcontracts;
var selectedProjects;
var token;

const app = express();
const PORT = process.env.PORT || 4000;
const SECRET_JWT_CODE = process.env.SECRET_JWT_CODE;

const client = new MongoClient(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});



app.use(cors({
	origin: '*'
}))

app.use(BodyParser.json());

app.use('/exports', express.static(path.join(__dirname, 'exports')));

app.get("/portal/handleExport", async (req, res) => {
  console.log('hello');
  try {
    const contracts = await database.Contracts.find().lean().exec();

    // Convert contracts data to JSON
    const jsonData = JSON.stringify(contracts, null, 2);

    // Create JSON file
    fs.writeFile('contracts.json', jsonData, (err) => {
      if (err) {
        console.error('Failed to write JSON file: ', err);
        res.json({ success: false });
      } else {
        console.log('JSON file created successfully!');

        // Convert JSON to Excel
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(contracts);

		// Apply styling to the header row
        const headerRange = xlsx.utils.decode_range(worksheet['!ref']);
        for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
          const headerCellAddress = xlsx.utils.encode_cell({ r: headerRange.s.r, c: col });
          worksheet[headerCellAddress].s = { font: { bold: true }, fill: { bgColor: { rgb: '212A3E' } } };
        }

        // Apply styling to the data cells
        const dataRange = xlsx.utils.decode_range(worksheet['!ref']);
        for (let row = dataRange.s.r + 1; row <= dataRange.e.r; row++) {
          for (let col = dataRange.s.c; col <= dataRange.e.c; col++) {
            const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
            worksheet[cellAddress].s = { alignment: { horizontal: 'left' }, fill: { bgColor: { rgb: 'FFFFFF' } } };
          }
        }
		
		xlsx.utils.book_append_sheet(workbook, worksheet, 'Contracts');

        // Create Excel file
        const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const excelFileName = `contracts_${Date.now()}.xlsx`;
        const excelFilePath = path.join(__dirname, 'exports', excelFileName);
        fs.writeFile(excelFilePath, excelBuffer, (err) => {
          if (err) {
            console.error('Failed to write Excel file: ', err);
			
            res.json({ success: false });
          } else {
            console.log('Excel file created successfully!');
			
            res.json({ success: true, fileName: excelFileName });
          }
        });
      }
    });
  } catch (err) {
    console.error('Error while retrieving data from MongoDB: ', err);
	
    res.json({ success: false });
  }
});

// checks if the database is connected or not
app.post("/portal/checkDB", async(req,res) => {
  const dbStatus = mongoose.connection.readyState;

  if (dbStatus === 1) {
	  
    res.json({ success: true});
  } else {
	  
    res.json({ success: false});
  }
})

//  for adding new employees and encrypting their password 
app.post("/portal/signup", (req,res) => {
	
	// checks for the inputs recieved
	if(!req.body.email || !req.body.password || !req.body.name || !req.body.position){ 
		
		res.json({success: false, error: "Enter needed params!"});
		return;
	}
	
	//creates a new document inside the Employees collection
	database.Employees.create({
		Name: req.body.name,
		email: req.body.email,
		password: Bcrypt.hashSync(req.body.password, 10),
		position: req.body.position
	}).then((employee) => {
		const token = JsonWebToken.sign({id: employee._id, email: employee.email}, SECRET_JWT_CODE);
		res.json({success: true, token: token});
	}).catch((err) => {
		res.json({success:false, error: err});
	})
	
});

//  to check the login inputs of the user and combine with the Database and creating a token
app.post("/portal/login", (req,res) => {
	if(!req.body.email || !req.body.password){
		 
		res.json({success: false, error: "Enter needed params"});
		return;
	}
	database.Employees.findOne({email: req.body.email}).then((Employees) => {
		if(!Employees){
			 
			res.json({success:false, error:"Wrong password/email"});
		} else {
			if(!Bcrypt.compareSync(req.body.password, Employees.password)){
				 
				res.json({success:false, error:"Wrong password/email"});
			} else {
				token = JsonWebToken.sign({id: Employees._id, email: Employees.email}, SECRET_JWT_CODE);
				if(Employees.position === "Admin"){
					 
					res.json({success: "Admin", token: token, name: Employees.Name, position: Employees.position});
				} else {
					 
					res.json({success: "Employee", token: token, name: Employees.Name, position: Employees.position});
				}
			}
		}
	}).catch((err) => {
		 
		res.json({success:false, error:err});
	});
});

// for confirming user tokens 
app.post('/portal/confirmUser', (req,res) => {
	if(!req.body.EmployeeName || !req.body.EmployeePosition || !req.body.EmployeeToken){
		 
		res.json({success: false, error: "Enter needed params"});
		return;
	}
	database.Employees.findOne({Name: req.body.EmployeeName, position: req.body.EmployeePosition }).then((Employees) => {
		if(!Employees){
			 
			res.json({success:false, error:"Wrong password/email"});
		} else {
			if(req.body.EmployeeToken === token){
				 
				res.json({success: true});
				console.log('successfully confirmed');
			}
			else{
				res.json({success: false});
				console.log('Not confirmed');
				console.log(Employees.email);
				console.log(token);
			}
		}
	}).catch((err) => {
		 
		res.json({success:false, error:err});
	});
})

// employees functionalities
app.get('/portal/getEmployees', async (req, res) => {
  try {
    const employees = await database.Employees.find();
	 
    res.json({ success: true, employees: employees });
  } catch (error) {
	   
    res.json({ success: false, error: error });
  }
});
app.post('/portal/getSelectedEmployees', async (req, res) => {
  if (!req.body.selectedRows) {
	   
    res.json({ success: false, error: 'No selected rows received' });
    return;
  }

  const selectedRows = req.body.selectedRows;

  try {
    selectedEmployees = await database.Employees.find({
      _id: { $in: selectedRows },
    });
	 
    res.json({ success: true, selectedEmployees: selectedEmployees });
  } catch (error) {
	   
    res.json({ success: false, error: error });
  }
});
app.post('/portal/updateEmplyee', async (req,res) => {
	if(!req.body.email || !req.body.password || !req.body.name || !req.body.position)
	{
		 
		res.json({success: false, error: "Enter needed params!"});
		return;
	}
		
		const lookForEmployee = await database.Employees.find({_id:{$in: selectedEmployees}}, ).catch((err) => {res.json({success:false});});
			database.Employees.updateMany({_id:{$in: selectedRows}}, {Name: req.body.name, position: req.body.position, email: req.body.email}).catch((err) => {
				 
				res.json({success:false});
		});
	selectedEmployees = NULL;
	 
	res.json({success:true});
})
app.post('/portal/deleteSelectedEmployees', async (req, res) => {
  if (!req.body.selectedRows) {
	   
    res.json({ success: false, error: 'No selected rows received' });
    return;
  }

  const selectedRows = req.body.selectedRows;

  try {
    database.Employees.deleteMany({_id: { $in: selectedRows }}).then((result) => {console.log(`${result.deletedCount} employees deleted.`);
	})
	 
    res.json({ success: true});
  } catch (error) {
	   
    res.json({ success: false, error: error });
  }
});

// project functionalities
app.post("/portal/addProject", (req,res) => {
	if(!req.body.dev || !req.body.project){
		 
		res.json({success: false, error:"Enter needed Parameters"});
	}
	
	database.Development.findOneAndUpdate({developer: req.body.dev}, {$push: {project: req.body.project}}).catch((err) => {
		 
		res.json({success:false, error: err});
	});
	 
	res.json({success:true});
});
app.get('/portal/getProjects', async (req,res) => {
	try {
		const projects = await database.Development.find();
		 
		res.json({success: true, projects:projects});
	} catch (error) {
		 
		res.json({success: true, error:error});
	}
})
app.post('/portal/getSelectedProjects', async (req, res) => {
	if (!req.body.selectedRows) {
		 
	res.json({ success: false, error: 'No selected rows received' });
	return;
	}

	const selectedRows = req.body.selectedRows;

	try {
	selectedProjects = await database.Development.find({
	  _id: { $in: selectedRows },
	});
	 
	res.json({ success: true, selectedProjects: selectedProjects });
	} catch (error) {
		 
	res.json({ success: false, error: error });
	}
})
app.post('/portal/deleteSelectedProjects', async (req, res) => {
  if (!req.body.dev || !req.body.project) {
	   
    res.json({ success: false, error: 'No selected rows received' });
    return;
  }

  const project = req.body.project;
  const dev = req.body.dev;

  try {
    database.Development.updateOne({developer:dev}, {$pull: {project: project}}).then((result) => {console.log(`project deleted.`);
	})
	 
    res.json({ success: true});
  } catch (error) {
	   
    res.json({ success: false, error: error });
  }
});

// team functionalities
app.post("/portal/addTeam", (req,res) => {
	if(!req.body.team){
		 
		res.json({success: false, error:"Enter needed Parameters"});
	}
	
	database.Team.create({
		team: req.body.team,
	}).catch((err) => {
		 
		res.json({success:false, error: err});
	});
	 
	res.json({success:true});
});
app.get('/portal/getTeams', async (req,res) => {
	try {
		const teams = await database.Team.find();
		 
		res.json({success: true, teams:teams});
	} catch (error) {
		 
		res.json({success: true, error:error});
	}
})
app.post('/portal/getSelectedTeams', async (req, res) => {
	if (!req.body.selectedRows) {
		 
	res.json({ success: false, error: 'No selected rows received' });
	return;
	}

	const selectedRows = req.body.selectedRows;

	try {
	selectedTeams = await database.Team.find({
	  _id: { $in: selectedRows },
	});
	 
	res.json({ success: true, selectedTeams: selectedTeams });
	} catch (error) {
		 
	res.json({ success: false, error: error });
	}
})
app.post('/portal/deleteSelectedTeams', async (req, res) => {
  if (!req.body.selectedRows) {
	   
    res.json({ success: false, error: 'No selected rows received' });
    return;
  }

  const selectedRows = req.body.selectedRows;

  try {
    database.Team.deleteMany({_id: { $in: selectedRows }}).then((result) => {console.log(`${result.deletedCount} teams deleted.`);
	})
    res.json({ success: true});
  } catch (error) {
	   
    res.json({ success: false, error: error });
  }
});

// stage functionalities
app.post("/portal/addStage", (req,res) => {
	if(!req.body.stage){
		 
		res.json({success: false, error:"Enter needed Parameters"});
	}
	
	database.Stage.create({
		stage: req.body.stage,
	}).catch((err) => {
		 
		res.json({success:false, error: err});
	});
	 
	res.json({success:true});
});
app.get('/portal/getStages', async (req,res) => {
	try {
		const stages = await database.Stage.find();
		 
		res.json({success: true, stages:stages});
	} catch (error) {
		 
		res.json({success: true, error:error});
	}
})
app.post('/portal/getSelectedStages', async (req, res) => {
	if (!req.body.selectedRows) {
		 
	res.json({ success: false, error: 'No selected rows received' });
	return;
	}

	const selectedRows = req.body.selectedRows;

	try {
	selectedStages = await database.Stage.find({
	  _id: { $in: selectedRows },
	});
	 
	res.json({ success: true, selectedStages: selectedStages });
	} catch (error) {
		 
	res.json({ success: false, error: error });
	}
})
app.post('/portal/deleteSelectedStages', async (req, res) => {
  if (!req.body.selectedRows) {
	   
    res.json({ success: false, error: 'No selected rows received' });
    return;
  }

  const selectedRows = req.body.selectedRows;

  try {
    database.Stage.deleteMany({_id: { $in: selectedRows }}).then((result) => {console.log(`${result.deletedCount} stages deleted.`);
	})
	 
    res.json({ success: true});
  } catch (error) {
	   
    res.json({ success: false, error: error });
  }
});

// sources functionalities
app.post("/portal/addSource", (req,res) => {
	if(!req.body.source){
		 
		res.json({success: false, error:"Enter needed Parameters"});
	}
	
	database.Source.create({
		source: req.body.source,
	}).catch((err) => {
		 
		res.json({success:false, error: err});
	});
	 
	res.json({success:true});
});
app.get('/portal/getSources', async (req,res) => {
	try {
		const sources = await database.Source.find();
		 
		res.json({success: true, sources:sources});
	} catch (error) {
		 
		res.json({success: true, error:error});
	}
})
app.post('/portal/getSelectedSources', async (req, res) => {
	if (!req.body.selectedRows) {
		 
	res.json({ success: false, error: 'No selected rows received' });
	return;
	}

	const selectedRows = req.body.selectedRows;

	try {
	selectedSources = await database.Source.find({
	  _id: { $in: selectedRows },
	});
	 
	res.json({ success: true, selectedSources: selectedSources });
	} catch (error) {
		 
	res.json({ success: false, error: error });
	}
})
app.post('/portal/deleteSelectedSources', async (req, res) => {
  if (!req.body.selectedRows) {
	   
    res.json({ success: false, error: 'No selected rows received' });
    return;
  }

  const selectedRows = req.body.selectedRows;

  try {
    database.Source.deleteMany({_id: { $in: selectedRows }}).then((result) => {console.log(`${result.deletedCount} sources deleted.`);
	})
    res.json({ success: true});
  } catch (error) {
	   
    res.json({ success: false, error: error });
  }
});

// property types functionalities
app.post("/portal/addProperty_Type", (req,res) => {
	if(!req.body.ptype){
		 
		res.json({success: false, error:"Enter needed Parameters"});
	}
	
	database.Property_Type.create({
		bedrooms: req.body.ptype,
	}).catch((err) => {
		 
		res.json({success:false, error: err});
	});
	 
	res.json({success:true});
})
app.get('/portal/getProperty_Types', async (req,res) => {
	try {
		const property_types = await database.Property_Type.find();
		 
		res.json({success: true, property_types:property_types});
	} catch (error) {
		 
		res.json({success: true, error:error});
	}
})
app.post('/portal/getSelectedProperty_Types', async (req, res) => {
	if (!req.body.selectedRows) {
	 	
	res.json({ success: false, error: 'No selected rows received' });
	return;
	}

	const selectedRows = req.body.selectedRows;

	try {
	selectedProperty_types = await database.Source.find({
	  _id: { $in: selectedRows },
	});

	res.json({ success: true, selectedProperty_types: selectedProperty_types });
	} catch (error) {
	 	
	res.json({ success: false, error: error });
	}
})
app.post('/portal/deleteSelectedProperty_Types', async (req, res) => {
  if (!req.body.selectedRows) {
	   
    res.json({ success: false, error: 'No selected rows received' });
    return;
  }

  const selectedRows = req.body.selectedRows;

  try {
    database.Property_Type.deleteMany({_id: { $in: selectedRows }}).then((result) => {console.log(`${result.deletedCount} Property_types deleted.`);
	})
	 
    res.json({ success: true});
  } catch (error) {
	   
    res.json({ success: false, error: error });
  }
});

// contracts functionalities
app.post("/portal/addContracts", (req,res) => {
	const requiredParams = [
    "SNo", "Start_Date", "source", "team", "stage", "Fname", "Lname", "dev", "project",
    "ptype", "Property_Num", "Property_Price", "Total_Commission", "Kickback_from_Commission",
    "Prime_Agent", "Percentage_from_Pot_to_Prime_Agent", "Percentage_to_Apex_from_Prime_Agent",
    "MOU_date", "payment_realised_date", "Agent_payout_Date"
	];
	  
	for (const param of requiredParams) {
		if (!req.body[param]) {
		  return res.json({ success: false, message: `Enter ${param}` });
		}
		console.log(`${param} : `,req.body[param]);
	}
	console.log("sec agent1 : ", req.body.Secondary_Agent1);
	console.log("sec agent2 : ", req.body.Secondary_Agent2);
	console.log("sec agent3 : ", req.body.Secondary_Agent3);
	console.log("sec agent1 % from pot : ", req.body.Percentage_from_Pot_to_Secondary_Agent1);
	console.log("sec agent2 % from pot : ", req.body.Percentage_from_Pot_to_Secondary_Agent2);
	console.log("sec agent3 % from pot : ", req.body.Percentage_from_Pot_to_Secondary_Agent3);
	console.log("sec agent1 % to apex : ", req.body.Percentage_to_Apex_from_Secondary_Agent1);
	console.log("sec agent2 % to apex : ", req.body.Percentage_to_Apex_from_Secondary_Agent2);
	console.log("sec agent3 % to apex : ", req.body.Percentage_to_Apex_from_Secondary_Agent3);
	
	const sec1Y = ((req.body.Secondary_Agent1 !== "" && 
					 req.body.Percentage_from_Pot_to_Secondary_Agent1 !== null  && 
					 req.body.Percentage_to_Apex_from_Secondary_Agent1 !== null 
					 ));
					 
	const sec1N = ((req.body.Secondary_Agent1 === "" && 
					 req.body.Percentage_from_Pot_to_Secondary_Agent1 === null  && 
					 req.body.Percentage_to_Apex_from_Secondary_Agent1 === null 
					 ));
					 
	const sec2Y = ((req.body.Secondary_Agent2 !== "" && 
					 req.body.Percentage_from_Pot_to_Secondary_Agent2 !== null  && 
					 req.body.Percentage_to_Apex_from_Secondary_Agent2 !== null ));
	
	const sec2N = ((req.body.Secondary_Agent2 === "" && 
					 req.body.Percentage_from_Pot_to_Secondary_Agent2 === null  && 
					 req.body.Percentage_to_Apex_from_Secondary_Agent2 === null ));
					 
	const sec3Y = ((req.body.Secondary_Agent3 !== "" && 
					 req.body.Percentage_from_Pot_to_Secondary_Agent3 !== null  && 
					 req.body.Percentage_to_Apex_from_Secondary_Agent3 !== null ));
	
	const sec3N = ((req.body.Secondary_Agent3 === "" && 
					 req.body.Percentage_from_Pot_to_Secondary_Agent3 === null  && 
					 req.body.Percentage_to_Apex_from_Secondary_Agent3 === null ));
					 
	const entMktY = (req.body.Percentage_of_Total_Comm_for_Mkt_and_Ent !== null);
	const entMktN = (req.body.Percentage_of_Total_Comm_for_Mkt_and_Ent === null);
	
	const otherPayoutY = (req.body.other_payouts !== null);
	const otherPayoutN = (req.body.other_payouts === null);
	
	const AEDkickbackY = (req.body.Kickback_from_Commission_AED !== null);
	const AEDkickbackN = (req.body.Kickback_from_Commission_AED === null);
	
	let Gross_Comm_Amount = (req.body.Property_Price*(req.body.Total_Commission/100));
	let Kickback_amount = (req.body.Property_Price*(req.body.Kickback_from_Commission/100));
	let kickback_amount_aed = 0;
	let Gross_Comm_To_Pot = Gross_Comm_Amount - Kickback_amount;
	let Total_Comm_To_Mkt_Ent = 0;
	let AED_To_Prime_Agent = 0;
	let AED_To_Secondary_Agent1 = 0;
	let AED_To_Secondary_Agent2 = 0;
	let AED_To_Secondary_Agent3 = 0;
	let AED_To_Apex_From_Prime_Agent = 0;
	let AED_To_Apex_From_Secondary_Agent1 = 0;
	let AED_To_Apex_From_Secondary_Agent2 =0;
	let AED_To_Apex_From_Secondary_Agent3 =0;
	let AED_Net_to_Prime_Agent = 0;
	let AED_Net_To_Secondary_Agent1 = 0;
	let AED_Net_To_Secondary_Agent2 = 0;
	let AED_Net_To_Secondary_Agent3 = 0;
	let AED_Net_Total_To_Apex_Comm = 0;
	let agent_earning_percentage = 0;
	let otherpayout = 0;
	let prime_percentage = 0;
	let sec1_percentage = 0;
	let sec2_percentage = 0;	
	let sec3_percentage = 0;
	let mkt_percentage = 0;
	
	if(AEDkickbackY){
		kickback_amount_aed = req.body.Kickback_from_Commission_AED;
		Kickback_amount = Kickback_amount - kickback_amount_aed;
	}
	else
		kickback_amount_aed = 0;
	
	if(otherPayoutY)
		otherpayout = req.body.other_payouts;
	else
		otherpayout = 0;
	
	if(entMktY){
		Total_Comm_To_Mkt_Ent = Gross_Comm_Amount * ((req.body.Percentage_of_Total_Comm_for_Mkt_and_Ent)/100);
		mkt_percentage = req.body.Percentage_of_Total_Comm_for_Mkt_and_Ent;
	}
	else
		Total_Comm_To_Mkt_Ent = 0;
	
	
	if(sec1Y){
		AED_To_Secondary_Agent1 = Gross_Comm_To_Pot * ((req.body.Percentage_from_Pot_to_Secondary_Agent1)/100);
		AED_To_Apex_From_Secondary_Agent1 = AED_To_Secondary_Agent1 * ((req.body.Percentage_to_Apex_from_Secondary_Agent1)/100);
		AED_Net_To_Secondary_Agent1 = AED_To_Secondary_Agent1 - AED_To_Apex_From_Secondary_Agent1;
		sec1_percentage = req.body.Percentage_from_Pot_to_Secondary_Agent1;
	} else if(sec1N){
		AED_To_Secondary_Agent1 = 0;
		AED_To_Apex_From_Secondary_Agent1 = 0;
		AED_Net_To_Secondary_Agent1 =0;
		sec1_percentage = 0;
	} else{
		return res.json({success:false, message: 'Secondary Agent 1 should be selected to enter their percentage'});
	}
		
	if(sec2Y){
		AED_To_Secondary_Agent2 = Gross_Comm_To_Pot * ((req.body.Percentage_from_Pot_to_Secondary_Agent2)/100);
		AED_To_Apex_From_Secondary_Agent2 = AED_To_Secondary_Agent2 * ((req.body.Percentage_to_Apex_from_Secondary_Agent2)/100);
		AED_Net_To_Secondary_Agent2 = AED_To_Secondary_Agent2 - AED_To_Apex_From_Secondary_Agent2;
		sec2_percentage = req.body.Percentage_from_Pot_to_Secondary_Agent2;
	}else if(sec2N){
		AED_To_Secondary_Agent2 = 0;
		AED_To_Apex_From_Secondary_Agent2 = 0;
		AED_Net_To_Secondary_Agent2 = 0;
		sec2_percentage = 0;
	} else{
		return res.json({success:false, message: 'Secondary Agent 2 should be selected to enter their percentage'});
	}
	
	if(sec3Y){
		AED_To_Secondary_Agent3 = Gross_Comm_To_Pot * ((req.body.Percentage_from_Pot_to_Secondary_Agent3)/100);
		AED_To_Apex_From_Secondary_Agent3 = AED_To_Secondary_Agent3 * ((req.body.Percentage_to_Apex_from_Secondary_Agent3)/100);
		AED_Net_To_Secondary_Agent3 = AED_To_Secondary_Agent3 - AED_To_Apex_From_Secondary_Agent3;
		sec3_percentage = req.body.Percentage_from_Pot_to_Secondary_Agent3;
	} else if(sec3N){
		AED_To_Secondary_Agent3 = 0;
		AED_To_Apex_From_Secondary_Agent3 = 0;
		AED_Net_To_Secondary_Agent3 = 0;
		sec3_percentage = 0;
	} else{
		return res.json({success:false, message: 'Secondary Agent 3 should be selected to enter their percentage'});
	}
	
	 AED_To_Prime_Agent = (Gross_Comm_To_Pot - Total_Comm_To_Mkt_Ent) * (req.body.Percentage_from_Pot_to_Prime_Agent/100);
	 
	 AED_To_Apex_From_Prime_Agent = AED_To_Prime_Agent * (req.body.Percentage_to_Apex_from_Prime_Agent/100);
	 
	 AED_Net_to_Prime_Agent = AED_To_Prime_Agent - AED_To_Apex_From_Prime_Agent;
	 
	 AED_Net_Total_To_Apex_Comm = Gross_Comm_To_Pot - Total_Comm_To_Mkt_Ent - AED_To_Prime_Agent - AED_To_Secondary_Agent1 - AED_To_Secondary_Agent2 - AED_To_Secondary_Agent3 + AED_To_Apex_From_Prime_Agent + AED_To_Apex_From_Secondary_Agent1 + AED_To_Apex_From_Secondary_Agent2 + AED_To_Apex_From_Secondary_Agent3;
	 
	 prime_percentage = req.body.Percentage_from_Pot_to_Prime_Agent;
	 console.log("prime %: ", prime_percentage);
	 console.log("sec1 %: ", sec1_percentage);
	 console.log("sec2 %: ", sec2_percentage);
	 console.log("sec3 %: ", sec3_percentage);
	 console.log("mkt %: ", mkt_percentage);
	 agent_earning_percentage = parseFloat(prime_percentage) + parseFloat(sec1_percentage) + parseFloat(sec2_percentage) + parseFloat(sec3_percentage) + parseFloat(mkt_percentage);
	 console.log("earning percentage : ", agent_earning_percentage);
	if(agent_earning_percentage === 100){
		database.Contracts.create({
			SNo: req.body.SNo,
			Start_Date: req.body.Start_Date,
			Source: req.body.source,
			Team: req.body.team,
			Stage: req.body.stage,
			First_Name: req.body.Fname,
			Last_Name: req.body.Lname,
			Developer: req.body.dev,
			Project_Name: req.body.project,
			Bedrooms: req.body.ptype,
			Property: req.body.Property_Num,
			Property_Price: req.body.Property_Price,
			Total_Commission: req.body.Total_Commission,
			Kickback_from_Commission: req.body.Kickback_from_Commission,
			Kickback_from_Commission_AED: kickback_amount_aed,
			Prime_Agent: req.body.Prime_Agent,
			Secondary_Agent1: req.body.Secondary_Agent1 || "-",
			Secondary_Agent2: req.body.Secondary_Agent2 || "-",
			Secondary_Agent3: req.body.Secondary_Agent3 || "-",
			percentage_from_Pot_to_Prime_Agent: req.body.Percentage_from_Pot_to_Prime_Agent,
			percentage_from_Pot_to_Secondary_Agent1: req.body.Percentage_from_Pot_to_Secondary_Agent1 || 0,
			percentage_from_Pot_to_Secondary_Agent2: req.body.Percentage_from_Pot_to_Secondary_Agent2 || 0,
			percentage_from_Pot_to_Secondary_Agent3: req.body.Percentage_from_Pot_to_Secondary_Agent3 || 0,
			percentage_to_Apex_from_Prime_Agent: req.body.Percentage_to_Apex_from_Prime_Agent,
			percentage_to_Apex_from_Secondary_Agent1: req.body.Percentage_to_Apex_from_Secondary_Agent1 || 0,
			percentage_to_Apex_from_Secondary_Agent2: req.body.Percentage_to_Apex_from_Secondary_Agent2 || 0,
			percentage_to_Apex_from_Secondary_Agent3: req.body.Percentage_to_Apex_from_Secondary_Agent3 || 0,
			percentage_of_Total_Comm_for_Mkt_and_Ent: req.body.Percentage_of_Total_Comm_for_Mkt_and_Ent || 0,
			MOU_date: req.body.MOU_date,
			payment_realised_date: req.body.payment_realised_date,
			Agent_payout_Date: req.body.Agent_payout_Date,
			Notes: req.body.note,
			Gross_Comm_Amount: Gross_Comm_Amount.toFixed(2),
			Kickback_amount: Kickback_amount.toFixed(2),
			Kickback_amount2: kickback_amount_aed,
			Gross_Comm_To_Pot: Gross_Comm_To_Pot.toFixed(2),
			Total_Comm_To_Mkt_Ent: Total_Comm_To_Mkt_Ent.toFixed(2),
			AED_To_Prime_Agent: AED_To_Prime_Agent.toFixed(2),
			AED_To_Secondary_Agent1: AED_To_Secondary_Agent1.toFixed(2),
			AED_To_Secondary_Agent2: AED_To_Secondary_Agent2.toFixed(2),
			AED_To_Secondary_Agent3: AED_To_Secondary_Agent3.toFixed(2),
			AED_To_Apex_From_Prime_Agent: AED_To_Apex_From_Prime_Agent.toFixed(2),
			AED_To_Apex_From_Secondary_Agent1: AED_To_Apex_From_Secondary_Agent1.toFixed(2),
			AED_To_Apex_From_Secondary_Agent2: AED_To_Apex_From_Secondary_Agent2.toFixed(2),
			AED_To_Apex_From_Secondary_Agent3: AED_To_Apex_From_Secondary_Agent3.toFixed(2),
			AED_Net_to_Prime_Agent: AED_Net_to_Prime_Agent.toFixed(2),
			AED_Net_To_Secondary_Agent1: AED_Net_To_Secondary_Agent1.toFixed(2),
			AED_Net_To_Secondary_Agent2: AED_Net_To_Secondary_Agent2.toFixed(2),
			AED_Net_To_Secondary_Agent3: AED_Net_To_Secondary_Agent3.toFixed(2),
			AED_Net_Total_To_Apex_Comm: AED_Net_Total_To_Apex_Comm.toFixed(2),
			Other_Payouts: req.body.other_payouts || 0,
		}).catch((err) => {
			 
			return res.json({success:false, message: err});
		});
	}else{
		return res.json({success:false, message: "The agents percentage total must be equal to 100%"});
	}
		 
	return res.json({success:true, message: "Add contract Successful"});
})
app.get('/portal/getContracts', async (req,res) => {
	  try {
    const contracts = await database.Contracts.find();
	res.set('Referrer-Policy', 'Access-Control-Allow-Origin');
    res.json({ success: true, contracts: contracts });
  } catch (error) {
	res.set('Referrer-Policy', 'Access-Control-Allow-Origin'); 
    res.json({ success: false, error: error });
  }
})
app.post('/portal/getSelectedContracts', async (req, res) => {
	if (!req.body.selectedRows) {
		 
	res.json({ success: false, error: 'No selected rows received' });
	return;
	}

	const selectedRows = req.body.selectedRows;

	try {
	selectedcontracts = await database.Contracts.find({
	  _id: { $in: selectedRows },
	});
	 
	res.json({ success: true, selectedContracts: selectedContracts });
	} catch (error) {
		 
	res.json({ success: false, error: error });
	}
})
app.post('/portal/deleteSelectedContracts', async (req, res) => {
  if (!req.body.selectedRows) {
	   
    res.json({ success: false, error: 'No selected rows received' });
    return;
  }

  const selectedRows = req.body.selectedRows;

  try {
    database.Contracts.deleteMany({_id: { $in: selectedRows }}).then((result) => {console.log(`${result.deletedCount} Contracts deleted.`);
	})
	 
    res.json({ success: true});
  } catch (error) {
	   
    res.json({ success: false, error: error });
  }
});
app.get('/portal/getCommisionContracts', async (req,res) => {
  database.Contracts.aggregate([
    {
      $group: {
        _id: null,
        commission_amount: { $sum: "$AED_Net_Total_To_Apex_Comm" }
      }
    }
  ])
    .exec()
    .then((result) => {
      const commission_amount = result.length > 0 ? result[0].commission_amount : 0;
      const formattedValue = commission_amount.toLocaleString(undefined, {minimumFractionDigits:0,maximumFractionDigits:0});
	   
	  res.json({ success: true, message: 'Commission calculated successfully!', formattedValue: formattedValue });
    })
    .catch((err) => {
		 
      res.json({ success: false, message: 'Error' });
    });
})
app.get('/portal/getEmployeeCommissionEarned', async (req,res) => {
  try {
	  let agentContracts = 0;
	  let agentNetPay = 0;
    // Retrieve all agents from the Employees collection
    const agents = await Employee.find({position: 'Agent'}, 'Name');
    // Calculate net pay for each agent
    const agentNetPayPromises = agents.map(async (agent) => {
      const agentName = agent.Name;

      // Calculate net pay for the agent using the Contracts collection
       agentContracts = await Contracts.find({ Prime_Agent: agentName });
       agentNetPay = agentContracts.reduce((total, contract) => {
        return total + contract.AED_Net_to_Prime_Agent;
      }, 0);
	  
	   agentContracts = await Contracts.find({ Secondary_Agent1: agentName });
       agentNetPay = agentContracts.reduce((total, contract) => {
        return total + contract.AED_Net_To_Secondary_Agent1;
      }, 0);
	  
	   agentContracts = await Contracts.find({ Secondary_Agent2: agentName });
       agentNetPay = agentContracts.reduce((total, contract) => {
        return total + contract.AED_Net_To_Secondary_Agent2;
      }, 0);
	  
	   agentContracts = await Contracts.find({ Secondary_Agent3: agentName });
       agentNetPay = agentContracts.reduce((total, contract) => {
        return total + contract.AED_Net_To_Secondary_Agent3;
      }, 0);

      return {
        agentName,
        agentNetPay,
      };
    });

    // Wait for all agent net pay calculations to complete
    const agentNetPayResults = await Promise.all(agentNetPayPromises);
	 
    res.json(agentNetPayResults);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }	
})
app.get('/portal/getEmployeeCommissionDate', async (req,res) => {
	database.Contracts.aggregate([
  {
    $project: {
      year: { $year: { $toDate: '$payment_realised_date' } }
    }
  }
])
  .then(result => {
    // Extracted year values
    const years = result.map(item => item.year);
  })
  .catch(error => {
    console.error(error);
  });
})

// developers functionalities
app.get('/portal/getDevelopers', async (req,res) => {
	try {
		const devs = await database.Development.find();
		 
		res.json({success: true, devs:devs});
	} catch (error) {
		 
		res.json({success: false, error:error});
	}
})
app.post('/portal/getSelectedDevelopers', async (req, res) => {
	if (!req.body.selectedRows) {
		 
	res.json({ success: false, error: 'No selected rows received' });
	return;
	}

	const selectedRows = req.body.selectedRows;

	try {
	selectedDevelopers = await database.Development.find({
	  _id: { $in: selectedRows },
	});
	 
	res.json({ success: true, selectedDevelopers: selectedDevelopers });
	} catch (error) {
		 
	res.json({ success: false, error: error });
	}
})
app.post('/portal/deleteSelectedDevelopers', async (req, res) => {
  if (!req.body.selectedRows) {
	   
    res.json({ success: false, error: 'No selected rows received' });
    return;
  }

  const selectedRows = req.body.selectedRows;

  try {
    database.Development.deleteMany({_id: { $in: selectedRows }}).then((result) => {console.log(`${result.deletedCount} developers deleted.`);
	})
	 
    res.json({ success: true});
  } catch (error) {
	   
    res.json({ success: false, error: error });
  }
});
app.post("/portal/addDeveloper", async (req,res) => {
	if(!req.body.deve){
		 
		return res.json({success: false, error:"Enter needed Parameters"});
	}
	
	try {
	await database.Development.create({
		developer: req.body.deve,
	});
	 
	    res.json({ success: true });
	} catch (err) {
		console.log('Error during add developer:', err);
		 
		res.json({ success: false, error: err });
	}
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});