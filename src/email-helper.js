const { Resend } = require('resend')


const emailHelper = {
	sendEmail: function (walletBalance) {
		const resend = new Resend(process.env.RESEND_API_KEY);

		resend.emails.send({
			from: 'updates@resend.dev',
			to: 'armarmitrix@gmail.com',
			subject: 'Update',
			html: `<p>Your wallet balance is: ${walletBalance}</p>`
		})
	}
}


module.exports = emailHelper