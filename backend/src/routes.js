const express = require('express');

const routes = express.Router();

const admin = require('firebase-admin');

const serviceAccount = require('../diary.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://diary-42d7a-default-rtdb.firebaseio.com/' // URL do seu Realtime Database
});

const db = admin.database();

const ref = db.ref('users');

var idUser;

routes.post('/create', (req, res) => {
    const { email, password } = req.body;
  
    if (email && password) {
      const novoObjeto = {
        email: email,
        password: password
      };
      ref.once('value')
      .then(snapshot => {
        const numChildren = snapshot.numChildren();
        ref
        .child(numChildren + 1)
        .set(novoObjeto)
        .then(() => {
          console.log('Novo objeto inserido com sucesso');
          idUser = numChildren + 1;
          return res.status(200).json(novoObjeto);
        })
        .catch(error => {
          console.error('Erro ao inserir novo objeto:', error);
          return res.status(500).json({ message: 'Erro ao inserir novo objeto' });
        });
      })
      
    } else {
      return res.status(401).json({ message: 'Dados inválidos' });
    }
  });




routes.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (email && password) {
    ref.once('value')
      .then(snapshot => {
        const numChildren = snapshot.numChildren(); // Obtém o número de filhos no nó

        let found = false;

        snapshot.forEach(childSnapshot => {
          const childData = childSnapshot.val();
          if (childData.email === email && childData.password === password) {
            found = true;
            idUser = childSnapshot.key;
            //return res.status(200).json(req.body);
          }
        });

        if (found) {
          
          return res.status(200).json({ message: 'Usuário autenticado com sucesso' });
        } else {
          return res.status(401).json({ message: 'Nome de usuário ou senha inválidos' });
        }
      })
      .catch(error => {
        console.error('Erro ao ler dados:', error);
        return res.status(500).json({ message: 'Erro ao realizar login' });
      });
  } else {
    return res.status(401).json({ message: 'Nome de usuário ou senha inválidos' });
  }
});



module.exports = routes;


const { TextAnalyticsClient, AzureKeyCredential } = require("@azure/ai-text-analytics");

const key = "d21d7e3fbbe84ecbaf2c91363fa6e31a";
const endpoint = "https://testetext.cognitiveservices.azure.com/";

const client = new TextAnalyticsClient(endpoint, new AzureKeyCredential(key));

routes.post('/text', async (req, res) => {
  const { text } = req.body;

  if (text) {
    try {
      const sentiment = await analyzeSentiment(text);

      const existingObj = await ref.child(idUser).once('value');
      const existingTexts = existingObj.val()?.textos || [];

      existingTexts.push({ texto: text, sentimento: sentiment });

      await ref.child(idUser).update({ textos: existingTexts });

      console.log('Novo texto adicionado com sucesso');
      return res.status(200).json(sentiment);
    } catch (error) {
      console.error('Erro ao adicionar novo texto:', error);
      return res.status(500).json({ message: 'Erro ao adicionar novo texto' });
    }
  } else {
    return res.status(401).json({ message: 'Texto inválido' });
  }
});



async function analyzeSentiment(text) {
  const results = await client.analyzeSentiment([text]);
  const sentiment = results[0].sentiment;
  console.log(`O sentimento do texto é ${sentiment}`);
  return sentiment;
}
