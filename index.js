const puppeteer = require('puppeteer');

// constant definition
const USERNAME_SELECTOR = '#UserName';
const PASSWORD_SELECTOR = '#Password';
const BUTTON_SELECTOR = '#Submit';
const EDS_SELECTOR = '#custServiceHeader_ddlCurrProfile';
const EDS_SELECTOR_VALUE = '2721351';
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

// To refresh the page
const waitFor = function(timeToWait) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(true);
    }, timeToWait);
  });
};

(async () => {
	  
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
		
			// show the result
			console.log(DBName, ",",DBStatus);
		}
	  }
	  
	  //console.log("End of this page");
	  if(flag == true && flagSRC == MOVE_DOWN_SRC){
		  await page.click(MD_SELECTOR);
		  await page.waitFor(5000);
	  }else{
		  flag = false;
	  }
	  pageIndex++;
  }while (flag)  
  //console.log('End of Scraping');

  //close the browser
  browser.close();
})();
