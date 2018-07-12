const puppeteer = require('puppeteer');
const fs = require('fs');


// constant definition
const USERNAME_SELECTOR = '#UserName';
const PASSWORD_SELECTOR = '#Password';
const BUTTON_SELECTOR = '#Submit';
const EDS_SELECTOR = '#custServiceHeader_ddlCurrProfile';
const EDS_SELECTOR_VALUE = '2721351';
const EDSAPI_SELECTOR_VALUE = '3022202';
const DB_NAME_SELECTOR = '#grid_MainDataGrid > tbody > tr:nth-child(INDEX) > td.DataGrid-ItemStyle > span';
const DB_STATUS_SELECTOR = '#Enable_INDEX_0';
const MOVE_DOWN_SELECTOR = '#grid_MainDataGrid > tbody:nth-child(1) > tr:nth-child(INDEX) > td:nth-child(1) > img:nth-child(1)';
const THIRD_COLUMN_SELECTOR = '#grid_MainDataGrid > tbody > tr:nth-child(INDEX) > td:nth-child(3)';
const CREDS = require('./creds');
// change exec path here on your local computer
const BROWSER_EXEC_PATH = 'C://Users//xzhao24//Downloads//Win_x64%2F565985%2Fchrome-win32//chrome-win32//chrome.exe'; 
const EBSCO_LOGIN_URL = 'http://eadmin.ebscohost.com/Login.aspx';
const EBSCO_DATABASE_URL = 'http://eadmin.ebscohost.com/profiles/CustomizeServiceDatabasesForm.aspx';
const MOVE_DOWN_SRC = 'http://eadmin.ebscohost.com/images/lib/arwSmallDownOn.gif';
const dir = './currentDatabases';
//readdir is async. Use readdirSync here to get the result.
const DBfiles =  fs.readdirSync(dir, (err, files) => {});
	  
	  
// create current date. 
function timeStamp() {
  // Create a date object with the current time
  var now = new Date();
  
  // Create an array with the current month, day and time
  var date = [now.getMonth() + 1, now.getDate(), now.getFullYear() ];

  // Create an array with the current hour, minute and second
  var time = [ now.getHours(), now.getMinutes(), now.getSeconds() ];

  // Determine AM or PM suffix based on the hour
  var suffix = ( time[0] < 12 ) ? "AM" : "PM";

  // Convert hour from military time
  time[0] = ( time[0] < 12 ) ? time[0] : time[0] - 12;

  // If hour is 0, set it to 12
  time[0] = time[0] || 12;

  // If seconds and minutes are less than 10, add a zero
    for ( var i = 0; i < 3; i++ ) {
      if ( time[i] < 10 ) {
        time[i] = "0" + time[i];
      }
	  
	  if(date[i] < 10){
		  date[i]  = "0" + date[i];
	  }
    }

  // Return the formatted string
  return date.join("") + " " + time.join("") + " " + suffix;
}

// function used to collect all the differences in two CSV files
function arr_diff (a1, a2) {

    var a = [], diff = [];

    for (var i = 0; i < a1.length; i++) {
        a[a1[i]] = true;
    }

    for (var i = 0; i < a2.length; i++) {
        if (a[a2[i]]) {
            delete a[a2[i]];
        } else {
            a[a2[i]] = true;
        }
    }

    for (var k in a) {
        diff.push(k);
    }
    //console.log(diff);
    return diff;
}

// fucntion used to analyse the differences
function arr_Analy (arr) {
    var a = [], b = [], c = [], prev;

    arr.sort();
    for ( var i = 0; i < arr.length; i++ ) {
        if ( arr[i].split(',')[0] !== prev ) {
            a.push(arr[i].split(',')[0]);
            b.push(1);
        } else {
            b[b.length-1]++;
        }
		c.push(arr[i].split(',')[1]);
        prev = arr[i].split(',')[0];
    }

    return [a, b, c];
}

// asseble database item based on its name
function assembleDBItem (db, dbName){
	for (var i = 0; i < db.length; i++){
		if(db[i].split(',')[0] === dbName){
			return db[i].split(',')[0] + ',' + db[i].split(',')[1];
		}
	}
	return 'nonexist';
}
(async () => {
  // ------------------------------------------------------------------------------------- 
  // ------------------------------------------ Scraping ---------------------------------
  // -------------------------------------------------------------------------------------
  
  console.log('Begin scraping');
  
  // init pupppeteer
  const browser = await puppeteer.launch({
    executablePath: BROWSER_EXEC_PATH,
    headless: false
  });
  
  // go to page
  const page = await browser.newPage();
  await page.goto(EBSCO_LOGIN_URL);

  // login 
  await page.click(USERNAME_SELECTOR);
  await page.type(USERNAME_SELECTOR,CREDS.username);
  await page.click(PASSWORD_SELECTOR);
  await page.type(PASSWORD_SELECTOR, CREDS.password);
  await page.click(BUTTON_SELECTOR);
  await page.waitForNavigation();
  
  // select eds from "Choose Profile" dropdown list
  await page.select(EDS_SELECTOR, EDS_SELECTOR_VALUE);
  
  // select 'Database' tab: After credentials verification and database selection, now go to database 
  await page.goto(EBSCO_DATABASE_URL);
  
  // get scraping result
  //let EDSresult = databaseScraping(page);
  //console.log(EDSresult);
  
  let EDSresult ='';
  let flag = true;
  let pageIndex = 1;
  let itemIndex = 2;
  do{
	  //console.log('page:', pageIndex); 
	  // get the number of rows in current table. Notice: At the last page of the database, the Remote Content is included 
	  let tableLength = await page.evaluate(() => document.getElementById('grid_MainDataGrid').rows.length);
	  //console.log('There are ',tableLength-2, ' items in current page');
	  
	  //set flag to indicate whether the table has next page
	  let MD_SELECTOR = MOVE_DOWN_SELECTOR.replace("INDEX", tableLength);
	  let flagSRC = await page.evaluate((sel) => {
		  return document.querySelector(sel).src;
	  }, MD_SELECTOR);
	  
	  // adjust first row
	  if(pageIndex==1){
		  itemIndex = 3;  
	  }else{
		  itemIndex = 2;
	  }
	  
	  // iterate all the info in the current table.
      // For Page 1, page index starts at 3, else index starts at 2	  
	  for(itemIndex; itemIndex <= tableLength; itemIndex++){
		  
		// if there are only 3 columns in a row, it means this column signals the end of current table
		let cn = await page.evaluate((sel) => {
			return document.getElementById('grid_MainDataGrid').rows[sel-1].cells.length;
		}, itemIndex);
		if(cn == 3){
			flag = false;
			break;
		}else{
			// selector for each iteration
			let DBNameSelector = DB_NAME_SELECTOR.replace("INDEX",itemIndex);
			let DBStatusSelector = DB_STATUS_SELECTOR.replace("INDEX", itemIndex-2);
			let DBStatusID = DBStatusSelector.replace('#','');

			// get the name of database in each row
			let DBName = await page.evaluate((sel) => {
				return document.querySelector(sel).innerText;
			}, DBNameSelector);
			
			// get the status of database in each row
			let DBStatus = await page.evaluate((sel) => {
				return document.getElementById(sel).checked;
			}, DBStatusID);

			// convert the status from 0/1 to disabled/enabled
			if(DBStatus == 1){
				DBStatus = 'enabled';
			}else{
				DBStatus = 'disabled';
			}
		
			// show the result on command line
			// console.log(DBName, ",",DBStatus);
			EDSresult += DBName+','+DBStatus+'\n';
		}
	  }
	  
	  //console.log("End of this page");
	  if(flag == true && flagSRC == MOVE_DOWN_SRC){	  
		  await page.click(MD_SELECTOR);
		  // wait for here is for selecting the content in the next loop
		  await page.waitFor(5000);
	  }else{
		  flag = false;
	  }
	  pageIndex++;
  }while (flag)  
  //console.log('End of Scraping');
  //console.log('End of Scraping');
  
  // save the result tp CSV file
  let timestamp = timeStamp();
  fileName = 'currentDatabases/currentDatabases' + timestamp + '.csv';
  fs.writeFile(fileName, EDSresult, 'utf8', function (err) {
    if (err) {
      console.log('Some error occured - file either not saved or corrupted file saved for CSV file.');
    }else{
      //console.log('CSV file for EDS database is saved!');
    }
  });

  //close the browser
  browser.close();
  
  // end of scraping 
  console.log('End of scraping');
  // ------------------------------------------------------------------------------------- 
  // ------------------------------------End of Scraping----------------------------------
  // -------------------------------------------------------------------------------------

  // ------------------------------------------------------------------------------------- 
  // ----------------------------------------- Logging -----------------------------------
  // -------------------------------------------------------------------------------------
  console.log('Begin logging');

  // if there is only one CSV file, the log.html should be empty

  
  //readdir is async. Use readdirSync here to get the result.
  let DBfiles =  fs.readdirSync(dir, (err, files) => {});
  let dbLog = 'databasesLog.html';
  let htmlString = '';
  // obtain logging date from file name
  // from format like 'currentDatabases07062018 122623 PM' to 07/06/2018 12:26:23 PM
  let dataString = DBfiles[DBfiles.length-1].toString().split('.')[0].substring(16, 34);
  let formatDataString = dataString.substring(0,2) + '/' + dataString.substring(2,4) + '/' + dataString.substring(4,8) + ' ' +
						 dataString.substring(9,11) + ':' + dataString.substring(11,13) + ':' + dataString.substring(13,15) + ' ' + dataString.substring(16,18);
  htmlString += 'Data script was run in ' + formatDataString + '<br>';
  if(DBfiles.length < 2){
	// if the currentdatabas folder contains less than 2 database files, then make log.hmtl empty 
	htmlString += 'Initial list generated <br>';
	fs.appendFile(dbLog, htmlString+ "\n", function (err) {
		if (err) console.log(err);
	});
  }else{
	  // most recent two files
	  fs.readFile('./currentDatabases/' + DBfiles[DBfiles.length-1],function read (err, data){
		  if(err){
			  throw err;
		  }
		  let cf1 = data.toString().split('\n');
		  //console.log('cf1 is : ' + cf1.toString());
		  fs.readFile('./currentDatabases/' + DBfiles[DBfiles.length-2],function read (err, data){
		    if(err){
			  throw err;
		    }
		    let cf2 = data.toString().split('\n');
		    //console.log('cf2 is : ' + cf2.toString());
		    // find all the differences between two files
	        let diffString = arr_diff(cf1, cf2);
	        //console.log(diffString);
			if(diffString.length !== 0){
			  //console.log('changes are made');
			  // analyze the differences - categorize them into three classes: status change, add and delete
			  let analyString = arr_Analy(diffString);
			  //console.log(analyString);
				for(var i = 0; i < analyString[1].length; i++){
				var dbItem = assembleDBItem(cf1, analyString[0][i]);
				  if(analyString[1][i] == 2){
				    // this database changes status
			        htmlString += dbItem + '<br>';
		          }else{
		            console.log(dbItem);
			        if(dbItem === 'nonexist'){//deleted
					  htmlString += analyString[0][i] + ' was deleted <br>';
			        }else{
				      htmlString += analyString[0][i] + ' was added <br>';
			        }
		          }
	            }
	        }else{
		      htmlString += 'No changes are made compared with previous database <br>';
		      //console.log(htmlString);
	        }
			fs.appendFile(dbLog, htmlString+ '<br>', function (err) {
				if (err) console.log(err);
			});
	      }); 
	    });
    }
    console.log('End of logging');
  

  // ------------------------------------------------------------------------------------- 
  // ------------------------------------- End of Logging --------------------------------
  // -------------------------------------------------------------------------------------

  // ------------------------------------------------------------------------------------- 
  // ------------------------------------- API Differences -------------------------------
  // -------------------------------------------------------------------------------------
  
  console.log('Begin API comparison');
  // scrape EBSCO Discovery Service API (edsapi) - wsapi first
  // init pupppeteer
  
  const browserA = await puppeteer.launch({
    executablePath: BROWSER_EXEC_PATH,
    headless: false
  });
  // go to page
  const pageA = await browserA.newPage();
  
  
  await pageA.goto(EBSCO_LOGIN_URL);
  // login 
  await pageA.click(USERNAME_SELECTOR);
  await pageA.type(USERNAME_SELECTOR,CREDS.username);
  await pageA.click(PASSWORD_SELECTOR);
  await pageA.type(PASSWORD_SELECTOR, CREDS.password);
  await pageA.click(BUTTON_SELECTOR);
  await pageA.waitForNavigation();
  // select eds from "Choose Profile" dropdown list
  await pageA.select(EDS_SELECTOR, EDSAPI_SELECTOR_VALUE);
  
  // select 'Database' tab: After credentials verification and database selection, now go to database 
  await pageA.goto(EBSCO_DATABASE_URL);
  
  // get scrpaing results
  let APIResult ='';
  
  // reset all the variables
  flag = true;
  pageIndex = 1;
  itemIndex = 2;
  do{
	  //console.log('page:', pageIndex); 
	  // get the number of rows in current table. Notice: At the last page of the database, the Remote Content is included 
	  let tableLength = await pageA.evaluate(() => document.getElementById('grid_MainDataGrid').rows.length);
	  //console.log('There are ',tableLength-2, ' items in current page');
	  
	  //set flag to indicate whether the table has next page
	  let MD_SELECTOR = MOVE_DOWN_SELECTOR.replace("INDEX", tableLength);
	  let flagSRC = await pageA.evaluate((sel) => {
		  return document.querySelector(sel).src;
	  }, MD_SELECTOR);
	  
	  // adjust first row
	  if(pageIndex==1){
		  itemIndex = 3;  
	  }else{
		  itemIndex = 2;
	  }
	  
	  // iterate all the info in the current table.
      // For Page 1, page index starts at 3, else index starts at 2	  
	  for(itemIndex; itemIndex <= tableLength; itemIndex++){
		  
		// if there are only 3 columns in a row, it means this column signals the end of current table
		let cn = await pageA.evaluate((sel) => {
			return document.getElementById('grid_MainDataGrid').rows[sel-1].cells.length;
		}, itemIndex);
		if(cn == 3){
			flag = false;
			break;
		}else{
			// selector for each iteration
			let DBNameSelector = DB_NAME_SELECTOR.replace("INDEX",itemIndex);
			let DBStatusSelector = DB_STATUS_SELECTOR.replace("INDEX", itemIndex-2);
			let DBStatusID = DBStatusSelector.replace('#','');

			// get the name of database in each row
			let DBName = await pageA.evaluate((sel) => {
				return document.querySelector(sel).innerText;
			}, DBNameSelector);
			
			// get the status of database in each row
			let DBStatus = await pageA.evaluate((sel) => {
				return document.getElementById(sel).checked;
			}, DBStatusID);

			// convert the status from 0/1 to disabled/enabled
			if(DBStatus == 1){
				DBStatus = 'enabled';
			}else{
				DBStatus = 'disabled';
			}
		
			// show the result on command line
			// console.log(DBName, ",",DBStatus);
			APIResult += DBName+','+DBStatus+'\n';
		}
	  }
	  
	  //console.log("End of this page");
	  if(flag == true && flagSRC == MOVE_DOWN_SRC){	  
		  await pageA.click(MD_SELECTOR);
		  // wait for here is for selecting the content in the next loop
		  await pageA.waitFor(5000);
	  }else{
		  flag = false;
	  }
	  pageIndex++;
  }while (flag)  
  //console.log('End of Scraping');
  //let APIResult = databaseScraping(page);
  fs.writeFile('API.csv', APIResult, 'utf8', function (err) {
    if (err) {
      console.log('Some error occured - file either not saved or corrupted file saved.');
    }else{
      //console.log('CSV file for EDSAPI is saved!');
    }
  });

  //close the browser
  browserA.close();

  fs.readFile('./currentDatabases/' + DBfiles[DBfiles.length-1],function read (err, data){
	if(err){
	  throw err;
	}
    let cf1c = data.toString().split('\n');
    fs.readFile('API.csv',function read (err, data){
      if(err){
		throw err;
		}
		let cf3 = data.toString().split('\n');
		let cf3result = [];
        let cf1result = [];
		for(var i = 1; i < cf3.length-1; i++){ // the last line in APT.csv is plank. -> i < lenght-1
			//console.log(cf3[i].split(',')[1]);
			var temp = cf3[i].split(',')[1];
			if(temp === 'enabled'){
			  cf3result.push(cf3[i].split(',')[0]);
		    }
        }
  
        for(var i = 1; i < cf1c.length-1; i++){ // the last line in lastes csv is plank. -> i < lenght-1
	      //console.log(cf1[i].split(',')[1]);
	      var temp = cf1c[i].split(',')[1];
	      if(temp === 'enabled'){
		    cf1result.push(cf1c[i].split(',')[0]);
	      }
        }
  
        let APIdiffString ='Different Enabled Databases Among EDS and EDSAPI<br>';
        let diffresult = arr_diff(cf1result, cf3result);
        for(var i = 0; i < diffresult.length; i++ ){
	      APIdiffString += diffresult[i] + '<br>';
        }
        //console.log(APIdiffString);
        let APIDiff = 'APIDifferences.html';
        fs.appendFile(APIDiff, APIdiffString+ '<br>', function (err) {
	    if (err) console.log(err);
        });
	});
  });
  console.log('End of API comparison');
  // ------------------------------------------------------------------------------------- 
  // ----------------------------------End of API Differences ----------------------------
  // -------------------------------------------------------------------------------------
})();