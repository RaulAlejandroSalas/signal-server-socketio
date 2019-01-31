function MiniRoom(id,transmisor) {
    this.id = id;
    this.transmisor= transmisor;
    this.receptor = null;
    this.live = false;
}

module.exports = MiniRoom;
