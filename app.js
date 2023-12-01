

const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path'); // Import the 'path' module

const app = express();
const port = 3000;

let results;
// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

// Create a connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', //ur password
  database: '', //ur database's name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware to parse form data

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'form.html'));
});

// Handle form submission
app.post('/submit', async (req, res) => {
  const { Nom, Prenom, GENRE, DateDeNaissance, Email, MotDePasse, person } = req.body;
  console.log('Received a signup request');
  console.log('Person:', person);

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(MotDePasse, 10);

    // Insert user data into the database
    pool.query(
      'INSERT INTO Utilisateur (Nom, Prenom, GENRE, DateDeNaissance, Email, MotDePasse, person) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [Nom, Prenom, GENRE, DateDeNaissance, Email, hashedPassword, person],
      (error, queryResults) => {
        if (error) {
          console.error('Error inserting user:', error);
          res.status(500).send('Internal Server Error');
        } else {
          results = queryResults;  // Assign the global variable
          console.log('User added to the database');

          // Check the value of the 'person' field to determine the type
          if (person === 'patient') {
            // If the user is a patient, insert data into the Patient table
            pool.query(
              'INSERT INTO patient (ID_U) VALUES (?)',
              [results.insertId], // Use the ID generated from the previous insertion
              (patientError, patientResults) => {
                if (patientError) {
                  console.error('Error inserting patient:', patientError);
                  res.status(500).send('Internal Server Error');
                } else {
                  console.log('Patient added to the Patient table');
                }
              }
            );
          } else if (person === 'doctor') {
            const { Specialite } = req.body;
            pool.query(
              'INSERT INTO medecin (ID_U, Specialite) VALUES (?, ?)',
              [results.insertId, Specialite], // Use the ID generated from the previous insertion
              (doctorError, doctorResults) => {
                if (doctorError) {
                  console.error('Error inserting medecin:', doctorError);
                  res.status(500).send('Internal Server Error');
                } else {
                  console.log('doctor added to the medecin table');
                }
              }
            );
          } else {
            res.status(200).send('User added successfully');
          }
        }
      }
    );
  } catch (error) {
    console.error('Error hashing password:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});


// Handle login form submission
app.post('/login', async (req, res) => {
  const { Email, password } = req.body;
  console.log('Received a login request');

  try {
// Fetch user from the database based on the unique email
pool.query(
  'SELECT MotDePasse, person FROM Utilisateur WHERE Email = ?',
  [Email],
  async (error, results) => {
    if (error) {
      console.error('Error fetching user:', error);
      res.status(500).send('Internal Server Error');
    } else {
      if (results.length === 1) {
        const hashedPassword = results[0].MotDePasse;
        if (hashedPassword) {
          const passwordMatch = await bcrypt.compare(password, hashedPassword);
          if (passwordMatch) {
            const person = results[0].person;
            if (person === 'patient') {
              // Redirect to patient page if the user is a patient
              //res.redirect('/patientPage');
              console.log('U are a Patient')
            } else if (person === 'doctor') {
              // Redirect to doctor page if the user is a doctor
              //res.redirect('/doctorPage'); 
              console.log('U are a doctor')
            }
              else {
                res.status(500).send('Unknown role');
              }
        
          } else {
            res.status(401).send('Incorrect email or password');
          }
        } else {
          res.status(500).send('User has no password set');
        }
      } else if (results.length === 0) {
        res.status(401).send('User not found');
      } else {
        res.status(500).send('Multiple users found with the same email');
      }
    }
  }
);

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('Internal Server Error');
  }
});

