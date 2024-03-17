class ApiRes {
  constructor(statuscode, message = "success", data) {
    this.statuscode = statuscode;
    this.message = message;
    this.data = data;
    this.success = statuscode < 400;
  }
}

export {ApiRes}