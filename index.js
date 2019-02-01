'use strict';

const express = require('express');
const socketIO = require('socket.io');
const _ = require('underscore');
const path = require('path');
const Room = require('./Room');
const utilsMethods = require('./utils');
let makeId = utilsMethods.makeId;
const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

const server = express()
    .use((req, res) => res.sendFile(INDEX))
    .listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = socketIO(server);

let users_connected = {};
let avialable_rooms = [];

io.sockets.on('connection', (socket) => {
    var ip_address = socket.request.connection.remoteAddress;
    console.log(ip_address);
    console.log('Client connected from: ' + ip_address + ":" + ip_address);
    users_connected[socket.id] = socket;
    let _message = {
        status: 200,
        data: {
            userId: socket.id,
            message: "Join Server Successfully",
            users: _.size(users_connected)
        }
    };
    console.log(_message);
    socket.emit('join_server_response', _message)

    socket.on('create_room', (message) => {
        let room = new Room(makeId(), message.userId);
        room.live = true;
        room.transmisor = socket;
        let _message = {
            status: 200,
            data: {
                message: "Room create successfully",
                room: room.id
            }
        };
        socket.room = room.id;
        avialable_rooms.push(room);
        console.log(_message);
        socket.emit('create_room_response', _message);
    });

    socket.on('join_room', (message) => {
        let room = avialable_rooms.find(obj => obj.id === message.room);
        if (room === undefined) {
            let _message = {
                status: 400,
                data: {
                    message: "The room with name: " + message.room + " not exist"
                }
            };
            console.log(_message);
            socket.emit('join_room_response', _message);
        } else {
            if (room.receptor === null) {
                room.receptor = socket;
                socket.room = room.id;
                let _message = {
                    status: 200,
                    data: {
                        message: "The client with id: " + message.userId + " ist joined to: " + message.room
                    }
                };
                console.log(_message);
                socket.emit('join_room_response', _message);
            } else {
                let _message = {
                    status:400,
                    data: {
                        message: "There is already a receiver for the room with id: " + message.room
                    }
                }
                socket.emit('join_room_response', _message);
            }
        }
    });

    socket.on('video_offer', (message) => {
        let room = avialable_rooms.find(obj => obj.id === message.room);
        if (room !== undefined && room.live === true) {
            if (room.transmisor !== null) {
                //let transmissor_socket = users_connected[room.transmisor];
                if (room.transmisor) {
                    let _message = {
                        offer: message.offer,
                        from: message.from,
                        room: message.room
                    };
                    console.log(_message);
                    room.transmisor.emit('video_offer', _message);
                }
            }
        } else {
            let _message = {
                status: 400,
                data: {
                    message: "Video Offer Invalid room"
                }
            };
            console.log(_message);
            socket.emit('video_offer', _message);
        }
    });

    socket.on('video_answer', (message) => {
        let room = avialable_rooms.find(obj => obj.id === message.room);
        if (room !== undefined && room.live === true) {
            if (room.receptor !== null) {
                // let receptor_socket = users_connected[room.receptor];
                if (room.receptor) {
                    var _message = {
                        from: message.from,
                        answer: message.answer,
                        room: message.room
                    };
                    console.log(_message);
                    room.receptor.emit('video_answer', _message);
                }
            }
        } else {
            let _message = {
                status: 400,
                data: {
                    message: "Video Answer Invalid room"
                }
            };
            console.log(_message);
            socket.emit('video_answer', _message);
        }
    });

    socket.on('candidate', (message) => {
        var room = avialable_rooms.find(obj => obj.id === message.room);
        if (room !== undefined && room.live === true) {
            let _message = {
                from: message.from,
                candidate: message.candidate,
                room: message.room
            };
            if (room.receptor.id === message.from) {
                console.log(_message);
                room.transmisor.emit('candidate', _message);
            } else if (room.transmisor.id === message.from) {
                console.log(_message);
                room.receptor.emit('candidate', _message);
            }
        }
    });

    socket.on('hangup', (message) => {
        let room = avialable_rooms.find(obj => obj.id === message.room);
        if (room !== undefined && room.live === true) {
            let _message = {
                from: message.from,
                room: message.room
            };
            if (room.receptor === message.from) {
                let transmisor_socket = users_connected[room.transmisor];
                console.log(_message);
                transmisor_socket.emit('hangup_response', _message);
            } else if (room.transmisor === message.from) {
                let receptor_socket = users_connected[room.receptor];
                if (receptor_socket !== undefined) {
                    console.log(_message);
                    receptor_socket.send(JSON.stringify(_message))
                } else {
                    let _message = {
                        status: 400,
                        data: {
                            message: "Hangup, The room with Id: " + room.id + " don't have receptor"
                        }
                    };
                    console.log(_message);
                    socket.emit('hangup_response', _message);
                }
            }
        } else {
            let _message = {
                type: 'error',
                status: 400,
                data: {
                    message: "Hangup Invalid Room"
                }
            };
            console.log(_message);
            socket.emit('hangup_response', _message);
        }
    });
    socket.on('disconnect', () => {
        console.log("Client Disconnect!!!");
        let room = avialable_rooms.find(obj => obj.id === socket.room);
        if (room !== undefined) {
            if (room.receptor === socket.id) {
                let _message = {
                    from: socket.id,
                    room: room.id
                };
                let transmisor_socket = users_connected[room.transmisor];
                console.log(_message);
                transmisor_socket.emit('leave', _message);
                delete users_connected[socket.id];
                //roomIndex = avialable_rooms.findIndex((obj => obj.id == socket.room));
                //avialable_rooms[roomIndex].receptor = null;
                avialable_rooms = avialable_rooms.filter(_room => _room.id !== room.id);
            } else if (room.transmisor === socket.id) {
                let _message = {
                    from: socket.id,
                    room: room.id
                };
                let receptor_socket = users_connected[room.receptor];
                if (receptor_socket !== undefined) {
                    console.log(_message);
                    receptor_socket.emit('leave', _message);
                    delete users_connected[socket.id];
                    avialable_rooms = avialable_rooms.filter(_room => _room.id !== room.id);
                }
            }
        } else {
            //No hay room creada 
            delete users_connected[socket.id];
            console.log(_.size(users_connected));
        }
    });
});

