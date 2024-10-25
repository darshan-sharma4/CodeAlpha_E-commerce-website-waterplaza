const express = require('express')
const app = express()
const port = 8000

const nodemailer = require('nodemailer')
const mongoose = require('mongoose')
const Razorpay = require('razorpay')
const crypto = require('crypto')

app.use(express.static("public"))
app.use(express.json())

const bookingSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  phone: Number,
  date: String,
  adults: Number,
  children: Number,
  roomType: String,
  rooms: Number,
  rawAmount: Number,
  promo: String,
  amount: Number
});

var Book = mongoose.model('bookingDetail', bookingSchema);

main().catch(err => console.log(err));

async function main() {
  await mongoose.connect('mongodb://localhost:27017/waterpark');
}

var instance = new Razorpay({
  key_id: 'rzp_test_xTmCshVEBq5XP8',
  key_secret: '1XbD83hSOxTJPrM08exxQQ1s',
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + "/public/index.html")
})

// send email
app.post('/', (req, res) => {


  const transpoter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'example@gmail.com',
      pass: 'example123.'
    }
  })

  const mailOptions = {
    from: req.body.email,
    to: 'example@gmail.com',
    subject: `Message from ${req.body.name}: ${req.body.subject}`,
    text: req.body.message
  }

  transpoter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      res.send('error');
    }
    else {
      console.log('Email Sent: ' + info.response);
      res.send('success');
    }
  })
})

// send booking details to db
app.post('/bookingDetails', (req, res) => {


  let data = new Book({
    firstName: req.body.first_name,
    lastName: req.body.last_name,
    email: req.body.email,
    phone: req.body.phone,
    date: req.body.date,
    adults: req.body.n_adults,
    children: req.body.n_children,
    roomType: req.body.room_type,
    rooms: req.body.n_rooms,
    rawAmount: req.body.raw_amount,
    promo: req.body.promo,
    amount: req.body.amount
  })

  data.save().then(() => {
  }).catch(() => {
    console.log('data database not conected')
  })
})


app.post('/create/orderId', (req, res) => {
  var options = {
    amount: req.body.amount,
    currency: "INR",
    receipt: "order_rcptid_1"
  };

  instance.orders.create(options, function (err, order) {
    if (err) {
      console.log(err)
    }
    res.send({ orderId: order.id });
  });
})

app.post("/api/payment/verify", (req, res) => {
 
  let body = req.body.response.razorpay_order_id + "|" + req.body.response.razorpay_payment_id;

  var expectedSignature = crypto.createHmac('sha256', '1XbD83hSOxTJPrM08exxQQ1s')
    .update(body.toString())
    .digest('hex');
  var response = { "signatureIsValid": "false" }
  if (expectedSignature === req.body.response.razorpay_signature)
    response = { "signatureIsValid": "true" }

  Book.find().then((result) => {
    let ourdata = result.pop();
    const transpoter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'example@gmail.com',
        pass: 'examplpe123.'
      }
    })
    const mailOptions = {
      from: 'example@gmail.com',
      to: ourdata.email,
      subject: `AquaLand Booking Details of ${ourdata.firstName} ${ourdata.lastName}`,
      text: `Your Booking Details are: \nBooking No. : ${ourdata._id} \nTotal Amount : ${ourdata.amount} \nDate : ${ourdata.date} \nOrder ID : ${req.body.response.razorpay_order_id} \nPayment ID : ${req.body.response.razorpay_payment_id} \n\nThankyou for reserving a day from your precious time in AquaLand. We will wait for you.`
    }
    transpoter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Email not sent');
      }
      else {
        console.log('Email sent: ' + info.response);
      }
    })

  }).catch(() => {
  
  })

});

// send cancel booking details to db
app.post('/cancelDetails', (req, res) => {
  const cancelSchema = new mongoose.Schema({
    radioOption: String,
    payorderId: String,
    bookingId: String,
    firstName: String,
    lastName: String,
    email: String,
    phone: Number,
    date: String
  });

  const Cancel = mongoose.model('cancelDetail', cancelSchema);

  let canceldata = new Cancel({
    radioOption: req.body.radioOption,
    payorderId: req.body.poid,
    bookingId: req.body.bid,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    phone: req.body.phone,
    date: req.body.date
  })

  canceldata.save().then(() => {
    
  }).catch(() => {
    
  })

  Book.deleteOne({ _id: req.body.bid }).then(() => {
   
  }).catch(() => {
    
  })

  const transpoter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'example@gmail.com',
      pass: 'example123.'
    }
  })
  const mailOptions = {
    from: 'example@gmail.com',
    to: req.body.email,
    subject: `AquaLand Booking Cancellation Details of ${req.body.firstName} ${req.body.lastName}`,
    text: `Your Booking Details for: \n\nBooking No. : ${req.body.bid} \nPayment/Order ID : ${req.body.poid} \nDate : ${req.body.date} \n\nhas been cancelled.\n\nYour amount will be refunded in 3 to 4 working days. Thankyou.`
  }
  transpoter.sendMail(mailOptions, (error, info) => {
    if (error) {
  
    }
    else {
    
    }
  })
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
