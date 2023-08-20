const jwt_decode = require("jwt-decode");

const {
  ApolloServer,
  gql,
  AuthenticationError,
  ValidationError,
  UserInputError,
  ForbiddenError,
  PersistedQueryNotFoundError,
  PersistedQueryNotSupportedError,
} = require("apollo-server-express");

exports.token_validation = async (token) => {
  let obj = {};
  if (!token) {
    return false;
    // throw new AuthenticationError("You must be logged in!");
  }

  // // token.replace("Bearer ","");

  var decoded = jwt_decode(token);

  // console.log("-----------------After Decode--------------------");
  // console.log(decoded);

  var userTypeFromToken = "business";

  // //console.log(decoded["custom:group"]);

  if (decoded.hasOwnProperty("custom:group")) {
    userTypeFromToken = decoded["custom:group"];
  }

  var company_id_From_Token = null;

  if (decoded.hasOwnProperty("custom:company_id")) {
    company_id_From_Token = decoded["custom:company_id"];
  }

  // // console.log(decoded.sub);
  // // console.log(userTypeFromToken);

  obj.userTypeFromToken = userTypeFromToken;
  obj.userIdFromToken = decoded.sub;
  obj.company_id_From_Token = company_id_From_Token;

  obj.decodedToken = decoded;

  return obj;
};
