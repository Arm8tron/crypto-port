const express = require("express");
require('dotenv').config()
const { CronJob } = require('cron');
const { engine } = require('express-handlebars');
const bodyparser = require('body-parser')

const getCombinedData = require('./src/wallet-helper');
const emailHelper = require('./src/email-helper');

const app = express();

app.use(bodyparser.urlencoded({ extended: true }));

app.engine('hbs', engine({
	layoutsDir: './views/layouts',
	extname: 'hbs'
}));

app.set('view engine', 'hbs');
app.set('views', './views');


app.use(express.static("public"));


app.get('/', async (req, res) => {
	if (!req.query.address) {
		res.render('main', { layout: 'index', isData: false });
		return;
	}

	const address = req.query.address;

	try {
		const { walletBalance, combinedData } = await getCombinedData(address);

		res.render('main', { layout: 'index', walletBalance, combinedData, address, isData: true });
	} catch (error) {
		console.log(error);
		res.render('main', { layout: 'index', isData: false });
	}
})

app.get('/ping', (req, res) => {
	res.send("pong");
})

app.post('/api/data', async (req, res) => {
	if (!req.body || !req.body.address) {
		res.send("Address not given");
		return;
	}

	const address = req.body.address;

	res.redirect(`/?address=${address}`)

	// try {
	// 	const { walletBalance, combinedData } = await getCombinedData(address);

	// 	res.send({ walletBalance, combinedData });
	// } catch (error) {
	// 	console.log(error);
	// 	res.send("Some error occured");
	// }
})


const PORT = process.env.PORT;

app.listen(PORT, () => {
	console.log(`Server listening on PORT ${PORT}`);
})

const cronExpression = '0 */2 * * *';

const job = new CronJob(
	cronExpression,
	cronFunction,
	null,
	true,
	'UTC'
)

async function cronFunction() {
	const address = process.env.PUBLIC_KEY;

	const { walletBalance } = await getCombinedData(address);

	if (walletBalance >= 3) {
		emailHelper.sendEmail(walletBalance);
	}
}