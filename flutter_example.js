const express = require('express')
const app = express()
const port = 8000


app.get('/', (req, res) => {
    console.log('getting request')
    res.sendFile('index.html',{root:__dirname})
  })

app.use(express.static(__dirname + '/'))

app.use((req, res)=>{
    res.redirect('/')
})

app.listen(port, () => {
    console.log(`app listening at http://localhost:${port}`)
  })