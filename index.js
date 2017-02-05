var express= require('express');
var app= express();
var server= require('http').createServer(app);
var io= require('socket.io').listen(server);
var users = {};
var mongoose= require('mongoose');
server.listen(3000);
console.log('listening on 3000');

mongoose.connect('mongodb://localhost/chat',function(err){
  if(err)
  {
    console.log(err);

  }
  else
  {
    console.log('connected to database');
  }
});
var chatschema = mongoose.Schema({
  nick : String,
  msg : String,
  created : {type: Date, default : Date.now}
});

var chatmodel= mongoose.model('Message',chatschema);
app.get('/',function(req,res)
{
    res.sendFile( __dirname+ '/index.html');
});

io.sockets.on('connection',function(socket){
  var q= chatmodel.find({});
   q.sort('-created').limit(15).exec(function(err,docs){
    if(err)
    {
      throw err;
    }
    socket.emit('load message',docs);
  });
    socket.on('new user',function(data,callback)
    {
      if(data in users)
      {
          callback(false);
      }
      else
      { callback(true);
        socket.nickname= data;
        users[socket.nickname]= socket;
        updatenicknames(); 
      }
    });

    socket.on('send',function(data,callback){
          var msg= data.trim();
          if(data.substr(0,3)== '/w ')
          {
              msg= msg.substr(3);
              var ind= msg.indexOf(' ');
              if(ind!=-1)
              {
                var name = msg.substring(0,ind);
                var msg= msg.substring(ind + 1);
                if(name in users)
                {
                  users[name].emit('whisper', { msg :msg, nick : socket.nickname})
                }
                else
                {
                  callback('Error : Enter a valid user');
                }

              }
              else

              {
                callback('Error : Please enter message for your whisper');    
              }

         }
          else{
            var mes = new chatmodel({msg : msg , nick : socket.nickname});
            mes.save(function(err){
              if(err)
              {
                throw err;
              }
             io.sockets.emit('new message', { msg :msg, nick : socket.nickname});
          });
      }
    });
    function updatenicknames()
    {
      io.sockets.emit('usernames',Object.keys(users));
    }

    socket.on('disconnect',function(data){
        if(!socket.nickname)
        {
          return;
        }
        delete users[socket.nickname];
        updatenicknames();
    });

});