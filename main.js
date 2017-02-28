"use strict"

const MSCP = require("mscp")
const mysql = require("mysql")

class Tagger{
  async initFirst(){
    this.initTables()
  }

  async query(query, ...args){
    return new Promise((resolve, reject) => {
      let conn = this.getConnection()
      conn.query.apply(conn, [query, args, (err, data) => {
        if(err){
          console.log(err)
          reject(err)
        } else {
          resolve(data)
        }
      }])
    })
  }

  getConnection(){
    if(this.global.dbPool === undefined){
      this.dbOptions = this.mscp.setupHandler.setup.database
      if(typeof this.dbOptions === "object"){
        this.dbOptions.connectionLimit = 10
        this.global.dbPool = mysql.createPool(this.dbOptions)
      } else {
        console.log("ERROR: Missing db options")
      }
    }
    return this.global.dbPool
  }

  async initTables(){
    await this.query("CREATE TABLE IF NOT EXISTS tagger(entity varchar(60) NOT NULL, tag varchar(100) NOT NULL, PRIMARY KEY(entity, tag))")
  }

  async add(id, tag){
    await this.query("INSERT IGNORE INTO tagger(entity, tag) VALUES(?)", [id, tag])
    return this.get(id)
  }

  async remove(id, tag){
    await this.query("DELETE FROM tagger WHERE entity = ? AND tag = ?", id, tag)
    return this.get(id)
  }

  async get(id){
    return (await this.query("SELECT tag FROM tagger WHERE entity = ?", id)).map(function(row) {
      return row['tag'];
    });
  }

  async list(prefix){
    if(prefix != null){
      return (await this.query("SELECT tag FROM tagger WHERE tag LIKE ? GROUP BY tag", prefix + "%")).map(function(row) {
        return row['tag'];
      });
    } else {
      return (await this.query("SELECT tag FROM tagger GROUP BY tag")).map(function(row) {
        return row['tag'];
      });
    }
  }

  async getAllByTag(tag){
    return (await this.query("SELECT entity FROM tagger WHERE tag = ?", tag)).map(function(row) {
      return row['entity'];
    });
  }

  async getAllByTags(tags){
    return (await this.query("SELECT entity FROM (SELECT entity FROM tagger GROUP BY entity) AS e WHERE (SELECT count(entity) FROM tagger WHERE entity = e.entity AND tag IN (?)) = ?", tags, tags.length)).map(function(row) {
      return row['entity'];
    });
  }
}

(async () => {
  let mscp = new MSCP(Tagger)
  await mscp.start()
})()
