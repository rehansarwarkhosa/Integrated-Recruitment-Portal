// // Local
// const express = require("express");
// const jwt_decode = require("jwt-decode");
// const {
//   ApolloServer,
//   gql,
//   AuthenticationError,
//   ValidationError,
//   UserInputError,
//   ForbiddenError,
//   PersistedQueryNotFoundError,
//   PersistedQueryNotSupportedError,
// } = require("apollo-server-express");
// const {
//   GraphQLUpload,
//   graphqlUploadExpress, // A Koa implementation is also exported.
// } = require("graphql-upload");
// // const { finished } = require("stream/promises");
// const { readFileSync } = require("fs");
// const path = require("path");
// const { PrismaClient } = require("@prisma/client");
// const { resolvers } = require("./resolvers.js");

// var jwt = require("jsonwebtoken");

// const prisma = new PrismaClient();

// async function startServer() {
//   const server = new ApolloServer({
//     typeDefs: readFileSync(path.join(__dirname, "schema.graphql"), "utf8"),
//     resolvers,
//     context: ({ req }) => {
//       const obj = { prisma };

//       //Triage
//       // var token =
//       //   "eyJraWQiOiJwVEF0cnVJMElwSVFoRUxuZTR5YnRwS3htM3dkS3hzWjlodDRvcUZROXNJPSIsImFsZyI6IlJTMjU2In0.eyJjdXN0b206bWlkZGxlX25hbWUiOiIgIiwic3ViIjoiNzJhYmQ5YTctODMwNi00OTA4LThlY2MtMzhmMTgyM2FjMmUxIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC51cy1lYXN0LTIuYW1hem9uYXdzLmNvbVwvdXMtZWFzdC0yX09DaXUzQ3czUSIsImN1c3RvbTp1c2VyX2lkIjoiM2E2YzI5OTUtMmFjNy00YTJmLWIxMTItNjA4MjkyOTNhYTA2IiwiY3VzdG9tOmdyb3VwIjoiVHJpYWdlIiwiY29nbml0bzp1c2VybmFtZSI6IjcyYWJkOWE3LTgzMDYtNDkwOC04ZWNjLTM4ZjE4MjNhYzJlMSIsIm9yaWdpbl9qdGkiOiI1YzVjOGVkYi03MzkzLTRkMTMtYjY5ZC00ZjQxNjk5ZmFmMzAiLCJjdXN0b206UmVhbF9Fc3RhdGVfSUQiOiIgIiwiYXVkIjoiNG91b2cyMDVhMTY5ZWQydWN2Yjc5ZjJvbGkiLCJjdXN0b206bGFzdF9uYW1lIjoiYWhtYWQiLCJldmVudF9pZCI6IjBmOGI5ZTk1LWM3OTAtNDc4NC04NjBhLWU2NjUwYmJjYmUyZSIsImN1c3RvbTpmaXJzdF9uYW1lIjoiZmlyZG91cyIsInRva2VuX3VzZSI6ImlkIiwiY3VzdG9tOnJlbmV3VGltZSI6IlR1ZSBBcHIgMTkgMjAyMiAxMzo0MjoxMiBHTVQrMDAwMCAoQ29vcmRpbmF0ZWQgVW5pdmVyc2FsIFRpbWUpIiwiYXV0aF90aW1lIjoxNjUwNDM3MzY4LCJleHAiOjE2NTA0NDA5NjgsImlhdCI6MTY1MDQzNzM2OCwianRpIjoiYjk3NDEyNmQtNjRkMS00N2NmLThjMmYtMzU4MmFmMmVlMWM4IiwiZW1haWwiOiJmaXJkb3Vza2hvc2FAZ21haWwuY29tIn0.OOJUKYARWVwk968gFS8qI33tT2JN8hB_dmQ8y6B64elFI_QZ7vErYcoi3h6RjuRkil1jrNEF7nBTqodTEpGsxJc_TTqi9TsQhPVMq-IIXP2FLsOnFPG4nY0MVTA1N8m4TS_3KAb7ULAoRHN0s5Qr_wrdW1uEIuAToUex70tmEvz-5fWHAs6u_OKvp6OKo1CxL_FZCW_Bq6gFoWqvjrlHcxcz4gBJJKbbRtYHX2i3z_vDiM6qoFcrMSjIy5_MNiHcnvqB23Q3dRPJgrk3GNsIvKKRzxngf5bp5oNtRs5HuWFwbOkoQlRoDmpiO1h9VDXOEQSA1DemqMwWVi32QhoFkQ";

//       //External
//       // var token =
//       //   "eyJraWQiOiJwVEF0cnVJMElwSVFoRUxuZTR5YnRwS3htM3dkS3hzWjlodDRvcUZROXNJPSIsImFsZyI6IlJTMjU2In0.eyJjdXN0b206bWlkZGxlX25hbWUiOiIgIiwic3ViIjoiY2FiOTA4MmItM2IwMi00NDU1LTgyOWMtMWYxYTE2MTliZGIzIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC51cy1lYXN0LTIuYW1hem9uYXdzLmNvbVwvdXMtZWFzdC0yX09DaXUzQ3czUSIsImN1c3RvbTp1c2VyX2lkIjoiY2VjYjI1OTYtMzJhOS00NWZlLWE4NzctNGQwMWYwYTgwMjY4IiwiY29nbml0bzp1c2VybmFtZSI6ImNhYjkwODJiLTNiMDItNDQ1NS04MjljLTFmMWExNjE5YmRiMyIsIm9yaWdpbl9qdGkiOiI2ZWMxMWUxZC1hOWYzLTRmMGEtOTMyZS1iNzM0YjkxODRiOTgiLCJjdXN0b206UmVhbF9Fc3RhdGVfSUQiOiIgIiwiYXVkIjoiNG91b2cyMDVhMTY5ZWQydWN2Yjc5ZjJvbGkiLCJjdXN0b206bGFzdF9uYW1lIjoiamF3YWlkIiwiZXZlbnRfaWQiOiJlMmJlNDYzYy0xYzkyLTQ3YjEtYmU5Ni0xNzU3YzU4ZjU2MmIiLCJjdXN0b206Zmlyc3RfbmFtZSI6InphaW5hYiIsInRva2VuX3VzZSI6ImlkIiwiY3VzdG9tOnJlbmV3VGltZSI6Ik1vbiBBcHIgMTggMjAyMiAxNzo0NzozMyBHTVQrMDUwMCAoUGFraXN0YW4gU3RhbmRhcmQgVGltZSkiLCJhdXRoX3RpbWUiOjE2NTA0MzgxMDEsImV4cCI6MTY1MDQ0MTcwMSwiaWF0IjoxNjUwNDM4MTAxLCJqdGkiOiIyMjIyZWUyMC1lN2U1LTRlM2ItODhkNS1lNGNjMTM0OTkzYjYiLCJlbWFpbCI6Im1lbW9uaWJhNzg2QGdtYWlsLmNvbSJ9.muI6Wi_MmaTQlVpZMJTGnPEsIwqyOhFSQtJw-lUGh1lpBg6WYC1fLAqjgfWDSS54b4ZuHhSAw0lkgwP5LtrYCbTzuHqxh0ez2ldQhXzyRA5PZCPeRSSrC5wcSDZtmiL38dZ_lerR7Y_QFZCKnnppvpEjaHe5i7_GWs8k9N2topWffsTdMR4o8uPjmzNyJxFGbW0NZboWNFokeV03pz08BDz7yel-ExGCRcm0QSdjPmXquzeI1Zn8HhlEimHumAussMqWNT5oe-SVGxtHje18j3yDFzdREoWCNpND2D7TSWYVSy6Y5ggbd-3fZG04YrV8L8bae_fZqTX7Ed8Y4kHufg";

//       // console.log(req.headers);

//       // Token comment start------------------------------------------------------------------------------
//       const token = req.headers.authorization || null;

//       // Token comment End------------------------------------------------------------------------------

//       return { token, prisma };
//     },
//   });

//   await server.start();

//   const app = express();
//   // default options
//   // app.use(fileUpload());

//   // This middleware should be added before calling `applyMiddleware`.
//   app.use(graphqlUploadExpress());

//   server.applyMiddleware({ app });

//   await new Promise((r) => app.listen({ port: 4000 }, r));

//   console.log(`🚀 Server ready at http://localhost:4000${server.graphqlPath}`);
// }

// startServer();
// //---------------------------------------------------
// //-------------------------------------------------------

// Pipe Line
// index.js
const jwt_decode = require("jwt-decode");
var jwt = require("jsonwebtoken");
const express = require("express");

const {
  ApolloServer,
  AuthenticationError,
  ValidationError,
  UserInputError,
  ForbiddenError,
  PersistedQueryNotFoundError,
  PersistedQueryNotSupportedError,
} = require("apollo-server-lambda");

// Commit test
const {
  GraphQLUpload,
  graphqlUploadExpress, // A Koa implementation is also exported.
} = require("graphql-upload");
// const { finished } = require("stream/promises");
const { readFileSync } = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { resolvers } = require("./resolvers.js");

const prisma = new PrismaClient();

const server = new ApolloServer({
  typeDefs: readFileSync(path.join(__dirname, "schema.graphql"), "utf8"),
  resolvers,
  context: ({ event }) => {
    // const obj = { prisma };

    // //Triage
    // // var token =
    // //   "eyJraWQiOiJwVEF0cnVJMElwSVFoRUxuZTR5YnRwS3htM3dkS3hzWjlodDRvcUZROXNJPSIsImFsZyI6IlJTMjU2In0.eyJjdXN0b206bWlkZGxlX25hbWUiOiIgIiwic3ViIjoiNzJhYmQ5YTctODMwNi00OTA4LThlY2MtMzhmMTgyM2FjMmUxIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC51cy1lYXN0LTIuYW1hem9uYXdzLmNvbVwvdXMtZWFzdC0yX09DaXUzQ3czUSIsImN1c3RvbTp1c2VyX2lkIjoiM2E2YzI5OTUtMmFjNy00YTJmLWIxMTItNjA4MjkyOTNhYTA2IiwiY3VzdG9tOmdyb3VwIjoiVHJpYWdlIiwiY29nbml0bzp1c2VybmFtZSI6IjcyYWJkOWE3LTgzMDYtNDkwOC04ZWNjLTM4ZjE4MjNhYzJlMSIsIm9yaWdpbl9qdGkiOiI1YzVjOGVkYi03MzkzLTRkMTMtYjY5ZC00ZjQxNjk5ZmFmMzAiLCJjdXN0b206UmVhbF9Fc3RhdGVfSUQiOiIgIiwiYXVkIjoiNG91b2cyMDVhMTY5ZWQydWN2Yjc5ZjJvbGkiLCJjdXN0b206bGFzdF9uYW1lIjoiYWhtYWQiLCJldmVudF9pZCI6IjBmOGI5ZTk1LWM3OTAtNDc4NC04NjBhLWU2NjUwYmJjYmUyZSIsImN1c3RvbTpmaXJzdF9uYW1lIjoiZmlyZG91cyIsInRva2VuX3VzZSI6ImlkIiwiY3VzdG9tOnJlbmV3VGltZSI6IlR1ZSBBcHIgMTkgMjAyMiAxMzo0MjoxMiBHTVQrMDAwMCAoQ29vcmRpbmF0ZWQgVW5pdmVyc2FsIFRpbWUpIiwiYXV0aF90aW1lIjoxNjUwNDM3MzY4LCJleHAiOjE2NTA0NDA5NjgsImlhdCI6MTY1MDQzNzM2OCwianRpIjoiYjk3NDEyNmQtNjRkMS00N2NmLThjMmYtMzU4MmFmMmVlMWM4IiwiZW1haWwiOiJmaXJkb3Vza2hvc2FAZ21haWwuY29tIn0.OOJUKYARWVwk968gFS8qI33tT2JN8hB_dmQ8y6B64elFI_QZ7vErYcoi3h6RjuRkil1jrNEF7nBTqodTEpGsxJc_TTqi9TsQhPVMq-IIXP2FLsOnFPG4nY0MVTA1N8m4TS_3KAb7ULAoRHN0s5Qr_wrdW1uEIuAToUex70tmEvz-5fWHAs6u_OKvp6OKo1CxL_FZCW_Bq6gFoWqvjrlHcxcz4gBJJKbbRtYHX2i3z_vDiM6qoFcrMSjIy5_MNiHcnvqB23Q3dRPJgrk3GNsIvKKRzxngf5bp5oNtRs5HuWFwbOkoQlRoDmpiO1h9VDXOEQSA1DemqMwWVi32QhoFkQ";

    // //External
    // // var token =
    // //   "eyJraWQiOiJwVEF0cnVJMElwSVFoRUxuZTR5YnRwS3htM3dkS3hzWjlodDRvcUZROXNJPSIsImFsZyI6IlJTMjU2In0.eyJjdXN0b206bWlkZGxlX25hbWUiOiIgIiwic3ViIjoiY2FiOTA4MmItM2IwMi00NDU1LTgyOWMtMWYxYTE2MTliZGIzIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC51cy1lYXN0LTIuYW1hem9uYXdzLmNvbVwvdXMtZWFzdC0yX09DaXUzQ3czUSIsImN1c3RvbTp1c2VyX2lkIjoiY2VjYjI1OTYtMzJhOS00NWZlLWE4NzctNGQwMWYwYTgwMjY4IiwiY29nbml0bzp1c2VybmFtZSI6ImNhYjkwODJiLTNiMDItNDQ1NS04MjljLTFmMWExNjE5YmRiMyIsIm9yaWdpbl9qdGkiOiI2ZWMxMWUxZC1hOWYzLTRmMGEtOTMyZS1iNzM0YjkxODRiOTgiLCJjdXN0b206UmVhbF9Fc3RhdGVfSUQiOiIgIiwiYXVkIjoiNG91b2cyMDVhMTY5ZWQydWN2Yjc5ZjJvbGkiLCJjdXN0b206bGFzdF9uYW1lIjoiamF3YWlkIiwiZXZlbnRfaWQiOiJlMmJlNDYzYy0xYzkyLTQ3YjEtYmU5Ni0xNzU3YzU4ZjU2MmIiLCJjdXN0b206Zmlyc3RfbmFtZSI6InphaW5hYiIsInRva2VuX3VzZSI6ImlkIiwiY3VzdG9tOnJlbmV3VGltZSI6Ik1vbiBBcHIgMTggMjAyMiAxNzo0NzozMyBHTVQrMDUwMCAoUGFraXN0YW4gU3RhbmRhcmQgVGltZSkiLCJhdXRoX3RpbWUiOjE2NTA0MzgxMDEsImV4cCI6MTY1MDQ0MTcwMSwiaWF0IjoxNjUwNDM4MTAxLCJqdGkiOiIyMjIyZWUyMC1lN2U1LTRlM2ItODhkNS1lNGNjMTM0OTkzYjYiLCJlbWFpbCI6Im1lbW9uaWJhNzg2QGdtYWlsLmNvbSJ9.muI6Wi_MmaTQlVpZMJTGnPEsIwqyOhFSQtJw-lUGh1lpBg6WYC1fLAqjgfWDSS54b4ZuHhSAw0lkgwP5LtrYCbTzuHqxh0ez2ldQhXzyRA5PZCPeRSSrC5wcSDZtmiL38dZ_lerR7Y_QFZCKnnppvpEjaHe5i7_GWs8k9N2topWffsTdMR4o8uPjmzNyJxFGbW0NZboWNFokeV03pz08BDz7yel-ExGCRcm0QSdjPmXquzeI1Zn8HhlEimHumAussMqWNT5oe-SVGxtHje18j3yDFzdREoWCNpND2D7TSWYVSy6Y5ggbd-3fZG04YrV8L8bae_fZqTX7Ed8Y4kHufg";

    // // console.log(event.headers);

    const token = event.headers.Authorization || null;

    // // console.log("-----------------Before Decode--------------------");
    // // console.log(token);

    // if (!token) {
    //   throw new AuthenticationError("You must be logged in!");
    // }

    // // // token.replace("Bearer ","");

    // var decoded = jwt_decode(token);
    // if (
    //   decoded == null &&
    //   token ===
    //     "U2FsdGVkX18l4EeclHMOZCJTYi9r/fywfG/v8gRNDoHD178VL6G+hxRqV1mOUC2+XX63DQkXwoPj85Q3flYQN971XxmGa8pzeZ10WijEVB8="
    // ) {
    //   console.log("Other");
    // }

    // // console.log("-----------------After Decode--------------------");
    // // console.log(decoded);

    // var userTypeFromToken = "business";

    // // //console.log(decoded["custom:group"]);

    // if (decoded.hasOwnProperty("custom:group")) {
    //   userTypeFromToken = decoded["custom:group"];
    // }

    // var company_id_From_Token = null;

    // if (decoded.hasOwnProperty("custom:company_id")) {
    //   company_id_From_Token = decoded["custom:company_id"];
    // }

    // // // console.log(decoded.sub);
    // // // console.log(userTypeFromToken);

    // obj.userTypeFromToken = userTypeFromToken;
    // obj.userIdFromToken = decoded.sub;
    // obj.company_id_From_Token = company_id_From_Token;

    // obj.decodedToken = decoded;

    return { token, prisma };
  },
});

exports.graphqlHandler = server.createHandler({
  expressGetMiddlewareOptions: {
    cors: {
      origin: "*",
      credentials: true,
    },
  },
  expressAppFromMiddleware(middleware) {
    const app = express();

    app.use(graphqlUploadExpress());

    app.use(middleware);

    return app;
  },
});
