import express from 'express';
import cors from 'cors'
import bcrypt from 'bcrypt'
import pkg from 'knex'
const { knex } = pkg

const db = knex({
    client: 'pg',
    connection: {
        host: '127.0.0.1',
        user: 'tyseawood',
        password: '',
        database: 'smart-brain'
    }
})

const app = express()

app.use(express.json())
app.use(cors())

app.post('/sign-in', (req , res)=> {
    db.select('email', 'hash').from('login')
        .where(
            'email', '=', req.body.email
        )
        .then((data) => {
          const isValid = bcrypt.compareSync(req.body.password, data[0].hash)
            if(isValid){
                return db.select('*').from('users')
                    .where('email', '=', req.body.email)
                    .then((user) => {
                        res.json(user[0])
                    })
                    .catch(() => res.status(400).json('unable to get user'))
            } else {
                res.status(400).json('wrong credentials')
            }
        })
        .catch(() => res.status(400).json('wrong credentials'))
})

app.post('/register', (req, res)=> {
    const { email, name, password } = req.body;
    const hash = bcrypt.hashSync(password, 10)
    db.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
            .into('login')
            .returning('email')
            .then(async loginEmail => {
                const user = await trx('users')
                    .returning('*')
                    .insert({
                        email: loginEmail[0].email,
                        name: name,
                        joined: new Date()
                    });
                res.json(user[0]);
            })
            .then(trx.commit)
            .catch(trx.rollback)
    })
        .catch(() => res.status(400).json('unable to register'))
})

app.get('/profile/:id', (req, res) => {
    const { id } = req.params;
    db.select('*').from('users').where({id})
        .then((user) => {
            if (user.length) {
                res.json(user[0])
            } else {
                res.status(400).json('Not found')
            }
        })
        .catch(() => res.status(400).json('error getting user'))
})

app.put('/image', (req, res) =>{
    const { id } = req.body
    db('users').where('id', '=', id)
        .increment('entries', 1)
        .returning('entries')
        .then((entries) => {
            res.json(entries[0].entries)
        })
        .catch(() => res.status(400).json('unable to get entries'))
})

app.listen(4000, () => {
    console.log('app running on port 4000')
})