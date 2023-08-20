const express = require("express");
const nodemailer = require("nodemailer");
var path = require("path");
var axios = require("axios");
var FormData = require("form-data");
var request = require("request");
var fs = require("fs");
var data = new FormData();
const AWS = require("aws-sdk");
const stripeAPI = require("./stripe");
const jwt_decode = require("jwt-decode");
const validate_token = require("./validate_token");
var jwt = require("jsonwebtoken");
require("dotenv").config();

// const {nanoid} = require("nanoid");

const {
  AuthenticationError,
  ValidationError,
  UserInputError,
  ForbiddenError,
  PersistedQueryNotFoundError,
  PersistedQueryNotSupportedError,
} = require("apollo-server-lambda");

const {
  GraphQLUpload,
  graphqlUploadExpress, // A Koa implementation is also exported.
} = require("graphql-upload");
const { KnownFragmentNamesRule } = require("graphql");

let transporter = nodemailer.createTransport({
  host: "mail.supremecluster.com",
  port: 467,
  secure: true, // use TLS
  auth: {
    user: "contact@abc.com",
    pass: "123456",
  },
});

async function sendEmail(mailOptions) {
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    return {
      success: true,
      message:
        "Thank you for contacting us. Your message has been received and we will get back to you as soon as possible.",
    };
  } catch (error) {
    console.error("Failed to send email:", error);
    return {
      success: false,
      message:
        "Sorry, there was an issue sending your message. Please try again later or contact us via phone or social media.",
    };
  }
}

(FindGeographicCoordinate = async (address) => {
  let _latitude = null;
  let _longitude = null;
  let _location = null;

  function timeout() {
    return new Promise((resolve) => {
      const geocode = (address, callback) => {
        const url =
          "https://api.mapbox.com/geocoding/v19/mapbox.place/" +
          address +
          ".json?access_token=pk.eyJ1IjoiY29tImEiOiJja3h6cjkyMHgwZWpxMndtOGt4N3NyZXhzIn0.qG1q";

        request({ url, json: true }, (error, { body }) => {
          if (error) {
            callback("Unable to connect to location services!", undefined);
          } else if (body.features.length === 0) {
            callback("Unable to find location. Try another search.", undefined);
          } else {
            callback(undefined, {
              latitude: body.features[0].center[1],
              longitude: body.features[0].center[0],
              location: body.features[0].place_name,
            });
          }
        });
      };

      geocode(address, (error, { latitude, longitude, location } = {}) => {
        if (error) {
          //return res.send({ error });
          resolve();
        }

        // console.log("Latitude: ", latitude);
        // console.log("Longitude: ", longitude);
        // console.log("Location: ", location);

        _latitude = latitude;
        _longitude = longitude;
        _location = location;

        resolve();
      });
    });
  }

  await timeout();

  return {
    latitude: _latitude,
    longitude: _longitude,
    location: _location,
  };
}),
  (verifyToken = async (token) => {
    if (!token) {
      throw new AuthenticationError("You must be logged in!");
    }

    function timeout() {
      return new Promise((resolve) => {
        jwt.verify(token, process.env.secret, (err, decoded) => {
          if (err) {
            throw new AuthenticationError(err);
          }

          delete decoded.exp;

          return resolve(decoded);
          return token;
        });
      });
    }

    return await timeout();
  });

function calculateOrderAmount(cartItems) {
  return (
    cartItems.reduce((total, product) => {
      return total + product.price * product.quantity;
    }, 0) * 100
  );
}

function empty(e) {
  switch (e) {
    case "":
    case 0:
    case "0":
    case null:
    case false:
    case undefined:
      return true;
    default:
      return false;
  }
}

// ttt

async function paymentIntent(user_id, receipt_email, amount, description) {
  // const body = {
  //   cartItems: [
  //     {
  //       price: 35,
  //       quantity: 1,
  //     },
  //     {
  //       price: 28,
  //       quantity: 1,
  //     },
  //   ],

  //   shipping: {
  //     name: "John Smith",
  //     address: { line1: "10 downing street, london" },
  //   },

  //   description: "payment intent for cart items",
  //   receipt_email: "johns@gmail.com",
  // };

  // const { cartItems, description, receipt_email, shipping } = body;
  let paymentIntent;

  // console.log(calculateOrderAmount(cartItems));
  try {
    paymentIntent = await stripeAPI.paymentIntents.create({
      // amount: calculateOrderAmount(cartItems),
      // currency: "usd",
      // description,
      // payment_method_types: ["card"],
      // receipt_email,
      // shipping,.
      description,
      receipt_email,
      amount,
      currency: "usd",
      payment_method_types: ["card"],
      // customer: user_id,
    });

    // console.log({
    //   clientSecret: paymentIntent.client_secret,
    //   id: paymentIntent.id,
    // });

    return { clientSecret: paymentIntent.client_secret, id: paymentIntent.id };
    // res.status(200).json({ clientSecret: paymentIntent.client_secret, id: paymentIntent.id})
  } catch (error) {
    console.log(error);
    console.log({ error: "an error occured, unable to create payment intent" });
    return null;
    // res.status(400).json({ error: 'an error occured, unable to create payment intent' })
  }
}

const resolvers = {
  Upload: GraphQLUpload,

  Query: {
    geocode: async (parent, args, context) => {
      const { address } = args;

      let _latitude = null;
      let _longitude = null;
      let _location = null;

      function timeout() {
        return new Promise((resolve) => {
          const geocode = (address, callback) => {
            const url =
              "https://api.mapbox.com/geocoding/v19/mapbox.place/" +
              address +
              ".json?access_token=pk.eyJ1IjoiY2MHgwZWpxMndtOGt4N3NyZXhzIn0.qG1qpG4c4QvRplh41UnmkQ&limit=1";

            request({ url, json: true }, (error, { body }) => {
              if (error) {
                callback("Unable to connect to location services!", undefined);
              } else if (body.features.length === 0) {
                callback(
                  "Unable to find location. Try another search.",
                  undefined
                );
              } else {
                callback(undefined, {
                  latitude: body.features[0].center[1],
                  longitude: body.features[0].center[0],
                  location: body.features[0].place_name,
                });
              }
            });
          };

          geocode(address, (error, { latitude, longitude, location } = {}) => {
            if (error) {
              //return res.send({ error });
              resolve();
            }

            // console.log("Latitude: ", latitude);
            // console.log("Longitude: ", longitude);
            // console.log("Location: ", location);

            _latitude = latitude;
            _longitude = longitude;
            _location = location;

            resolve();
          });
        });
      }

      await timeout();

      return {
        latitude: _latitude,
        longitude: _longitude,
        location: _location,
      };
    },

    addressList: async (parent, args, context) => {
      const { address } = args;

      let _location = [];

      function timeout() {
        return new Promise((resolve) => {
          const geocode = (address, callback) => {
            const url =
              "https://api.mapbox.com/geocoding/v19/mapbox.place/" +
              address +
              ".json?access_token=pk.eyJ1IjoiY29tcHxMqpG4c4QvRplh41UnmkQ&limit=5";

            request({ url, json: true }, (error, { body }) => {
              if (error) {
                callback("Unable to connect to location services!", undefined);
              } else if (body.features.length === 0) {
                callback(
                  "Unable to find location. Try another search.",
                  undefined
                );
              } else {
                callback(undefined, {
                  location: body.features,
                });
              }
            });
          };

          geocode(address, (error, { location } = {}) => {
            if (error) {
              //return res.send({ error });
              resolve();
            }

            for (let i = 0; i < location.length; ++i) {
              _location.push(location[i].place_name);
            }

            // console.log(_location);

            resolve();
          });
        });
      }

      await timeout();

      return _location;
    },

    signin: async (parent, args, context) => {
      const { email, password } = args;

      const getUser = await context.prisma.Users.findMany({
        where: {
          email: email,
          password: password,
        },
      });

      if (getUser.length < 1) {
        return null;
      }

      delete getUser[0].password;

      var token = jwt.sign(
        {
          exp: Math.floor(Date.now() / 1000) + 60 * (60 * 12),
          data: getUser[0],
        },
        process.env.secret
      );

      return token;

      // const TokenObj = await validate_token.token_validation(context.token);

      // if (!TokenObj) {
      //   throw new AuthenticationError("You must be logged in!");
      //   // return null;
      // }

      // const {
      //   userTypeFromToken,
      //   userIdFromToken,
      //   decodedToken,
      //   company_id_From_Token,
      // } = TokenObj;

      // const user = await context.prisma.user.findUnique({
      //   where: {
      //     user_id: userIdFromToken,
      //   },
      // });

      // if (user == null) {
      //   //Common fields
      //   const newUser = {
      //     user_id: userIdFromToken,
      //     email: decodedToken.email,
      //     mobile_no: decodedToken.phone_number,
      //     user_name: decodedToken["cognito:username"],
      //     is_email_verified: decodedToken.email_verified,
      //     is_mobile_verified: decodedToken.phone_number_verified,
      //   };

      //   if (userTypeFromToken == "user") {
      //     console.log("userTypeFromToken == user");
      //     newUser.is_employer = false;
      //     newUser["first_name"] = decodedToken["custom:First_Name"];
      //     newUser["last_name"] = decodedToken["custom:Last_Name"];
      //   } else {
      //     // newUser["company_name"] = decodedToken["custom:Company_Name"];
      //     // newUser["GST_number"] = decodedToken["custom:gst_number"];

      //     newUser.is_employer = true;
      //     newUser.designation = "SUPER_ADMIN";

      //     // console.log(company_id_From_Token);

      //     //GST number null check

      //     if (decodedToken["custom:gst_number"]) {
      //       const insertCompany = await context.prisma.company.create({
      //         data: {
      //           company_id: company_id_From_Token,
      //           company_name: decodedToken["custom:Company_Name"],
      //           GST_number: decodedToken["custom:gst_number"],
      //         },
      //       });
      //     } else {
      //       const insertCompany = await context.prisma.company.create({
      //         data: {
      //           company_id: company_id_From_Token,
      //           company_name: decodedToken["custom:Company_Name"],
      //         },
      //       });
      //     }

      //     const insertCompany = await context.prisma.company.create({
      //       data: {
      //         company_id: company_id_From_Token,
      //         company_name: decodedToken["custom:Company_Name"],
      //         GST_number: decodedToken["custom:gst_number"],
      //       },
      //     });

      //     newUser.company_id = insertCompany.company_id;
      //   }

      //   // console.log(newUser);

      //   const usr = await context.prisma.user.create({
      //     data: { ...newUser },
      //   });

      //   //----------Add primary Email in email list
      //   if (newUser.is_employer) {
      //     const AddCompanyPrimaryEmail =
      //       await context.prisma.company_email.create({
      //         data: {
      //           email: newUser.email,
      //           company_id: newUser.company_id,
      //           is_primary: true,
      //         },
      //       });

      //     //-------------

      //     const AddUserPrimaryContact =
      //       await context.prisma.company_contact_no.create({
      //         data: {
      //           contact_no: newUser.mobile_no,
      //           company_id: newUser.company_id,
      //           is_primary: true,
      //         },
      //       });
      //   } else {
      //     await context.prisma.user_email.create({
      //       data: {
      //         email: newUser.email,
      //         user_id: newUser.user_id,
      //         is_primary: true,
      //       },
      //     });

      //     //-------------

      //     const AddUserPrimaryContact =
      //       await context.prisma.user_contact.create({
      //         data: {
      //           contact_no: newUser.mobile_no,
      //           user_id: newUser.user_id,
      //           is_primary: true,
      //         },
      //       });
      //   }
      //   //---------End-----------------------------

      //   return true;
      // } else {
      //   if (
      //     user.is_email_verified == false ||
      //     user.is_mobile_verified == false ||
      //     user.is_deleted == true
      //   ) {
      //     return false;
      //   }

      //   return true;
      // }
    },

    renewToken: async (parent, args, context) => {
      const { token } = args;

      let renewToken = await verifyToken(token);

      var _token = jwt.sign(
        {
          exp: Math.floor(Date.now() / 1000) + 60 * (60 * 12),
          data: renewToken.data,
        },
        process.env.secret
      );

      return _token;
    },

    AllJobs: async (parent, args, context) => {
      const { skip, take } = args;

      let getAllJobs;

      getAllJobs = await context.prisma.Jobs.findMany({
        skip: skip,
        take: take,

        orderBy: {
          created_at: "desc",
        },
      });

      return getAllJobs;
    },

    AllCandidatesWithoutJobLink: async (parent, args, context) => {
      const { skip, take } = args;
      await verifyToken(context.token);
      let getCandidates = await context.prisma.Candidates.findMany({
        skip: skip,
        take: take,
        where: {
          is_job_link: false,
        },
        orderBy: { created_at: "desc" },
      });

      return getCandidates;
    },

    AllCandidatesWithJobLink: async (parent, args, context) => {
      const { skip, take } = args;
      await verifyToken(context.token);
      let getCandidates = await context.prisma.Candidates.findMany({
        skip: skip,
        take: take,
        where: {
          is_job_link: true,
        },
        orderBy: { created_at: "desc" },
      });

      return getCandidates;
    },

    TotalNumberOfCandidatesWithoutJobLink: async (parent, args, context) => {
      await verifyToken(context.token);
      let getCandidates = await context.prisma.Candidates.findMany({
        where: {
          is_job_link: false,
        },
      });
      return getCandidates.length;
    },

    TotalNumberOfCandidatesWithJobLink: async (parent, args, context) => {
      await verifyToken(context.token);
      let getCandidates = await context.prisma.Candidates.findMany({
        where: {
          is_job_link: true,
        },
      });
      return getCandidates.length;
    },

    GetCandidateWithoutJobLinkByCandidateID: async (parent, args, context) => {
      const { candidate_id } = args;

      if (empty(candidate_id)) {
        throw new UserInputError("Candidate id is mandatory!");
      }

      let getCandidates = await context.prisma.Candidates.findMany({
        where: {
          candidate_id: candidate_id,
          is_job_link: false,
        },
      });

      if (getCandidates.length > 0) {
        return getCandidates[0];
      } else {
        return null;
      }
    },

    GetCandidateWithJobLinkByCandidateID: async (parent, args, context) => {
      const { candidate_id } = args;

      if (empty(candidate_id)) {
        throw new UserInputError("Candidate id is mandatory!");
      }

      let getCandidates = await context.prisma.Candidates.findMany({
        where: {
          candidate_id: candidate_id,
          is_job_link: true,
        },
      });

      if (getCandidates.length > 0) {
        return getCandidates[0];
      } else {
        return null;
      }
    },

    SeachAllJobsByJobTitle: async (parent, args, context) => {
      const { job_title } = args;

      if (empty(job_title)) {
        throw new UserInputError("Job title is mandatory!");
      }

      let getAllJobs;

      getAllJobs = await context.prisma.Jobs.findMany({
        where: {
          job_title: {
            contains: job_title,
            mode: "insensitive",
          },
        },
        orderBy: {
          created_at: "desc",
        },
      });

      return getAllJobs;
    },

    TotalNumberOfJobs: async (parent, args, context) => {
      let getAllJobs;

      getAllJobs = await context.prisma.Jobs.findMany({});

      return getAllJobs.length;
    },

    AllAgencyJobPosts: async (parent, args, context) => {
      const { skip, take } = args;
      // await verifyToken(context.token);
      let getAllAgencyJobPosts;

      getAllAgencyJobPosts = await context.prisma.AgencyJobPosts.findMany({
        skip: skip,
        take: take,

        orderBy: [
          {
            priority: "asc",
          },
          {
            created_at: "desc",
          },
        ],
      });

      return getAllAgencyJobPosts;
    },

    TotalNumberOfAgencyPostedJobs: async (parent, args, context) => {
      await verifyToken(context.token);
      let getAllAgencyJobPosts;

      getAllAgencyJobPosts = await context.prisma.AgencyJobPosts.findMany({});

      return getAllAgencyJobPosts.length;
    },

    SearchAgencyPostedJobByJobTitle: async (parent, args, context) => {
      const { job_title } = args;

      let getAgencyPostedJobByJobTitle;

      getAgencyPostedJobByJobTitle =
        await context.prisma.AgencyJobPosts.findMany({
          where: {
            job_title: {
              contains: job_title,
              mode: "insensitive",
            },
          },
          orderBy: {
            created_at: "desc",
          },
        });

      return getAgencyPostedJobByJobTitle;
    },

    SearchAgencyPostedJobByJobTitleLocationDistance: async (
      parent,
      args,
      context
    ) => {
      const { job_title, location, distance } = args;

      let is_job_title_exist = false;
      let is_location_exist = false;
      let is_distance_exist = false;

      let getAgencyPostedJobByJobTitleLocationDistance;

      if (job_title) {
        if (job_title !== "" && job_title != "" && job_title.length > 0) {
          is_job_title_exist = true;
        }
      }

      if (location) {
        if (location !== "" && location != "" && location.length > 0) {
          is_location_exist = true;
        }
      }

      if (distance) {
        if (distance > 0) {
          is_distance_exist = true;
        }
      }

      console.log(is_job_title_exist, is_location_exist, is_distance_exist);

      if (!is_job_title_exist && !is_location_exist) {
        console.log("!is_job_title_exist && !is_location_exist");
        return null;
        // throw new UserInputError("Invalid input!");
      }

      if (is_job_title_exist && is_location_exist && !is_distance_exist) {
        console.log(
          "is_job_title_exist && is_location_exist && !is_distance_exist"
        );

        getAgencyPostedJobByJobTitleLocationDistance =
          await context.prisma.AgencyJobPosts.findMany({
            where: {
              AND: [
                {
                  job_title: {
                    contains: job_title,
                    mode: "insensitive",
                  },
                },
                {
                  location: {
                    contains: location,
                    mode: "insensitive",
                  },
                },
              ],
            },
            orderBy: [
              {
                priority: "asc",
              },
              {
                created_at: "desc",
              },
            ],
          });

        return getAgencyPostedJobByJobTitleLocationDistance;
      }

      if (is_job_title_exist && !is_location_exist && !is_distance_exist) {
        console.log(
          "is_job_title_exist && !is_location_exist && !is_distance_exist"
        );
        getAgencyPostedJobByJobTitleLocationDistance =
          await context.prisma.AgencyJobPosts.findMany({
            where: {
              job_title: {
                contains: job_title,
                mode: "insensitive",
              },
            },
            orderBy: [
              {
                priority: "asc",
              },
              {
                created_at: "desc",
              },
            ],
          });

        return getAgencyPostedJobByJobTitleLocationDistance;
      }

      let coordinateObj = await FindGeographicCoordinate(location);

      // console.log(coordinateObj);

      let centerPoint;
      let checkPoint;

      if (
        coordinateObj.hasOwnProperty("latitude") &&
        coordinateObj.hasOwnProperty("longitude")
      ) {
        checkPoint = {
          lat: coordinateObj.latitude,
          lng: coordinateObj.longitude,
        };
      }

      function arePointsNear(checkPoint, centerPoint, km) {
        var ky = 40000 / 360;
        var kx = Math.cos((Math.PI * centerPoint.lat) / 180.0) * ky;
        var dx = Math.abs(centerPoint.lng - checkPoint.lng) * kx;
        var dy = Math.abs(centerPoint.lat - checkPoint.lat) * ky;
        return Math.sqrt(dx * dx + dy * dy) <= km;
      }

      let n;
      let responseObj = [];

      if (!is_job_title_exist && is_location_exist && is_distance_exist) {
        console.log(
          "------ !is_job_title_exist && is_location_exist && is_distance_exist ------"
        );

        getAgencyPostedJobByJobTitleLocationDistance =
          await context.prisma.AgencyJobPosts.findMany({
            where: {
              location: {
                contains: location,
                mode: "insensitive",
              },
            },
            orderBy: [
              {
                priority: "asc",
              },
              {
                created_at: "desc",
              },
            ],
          });

        for (
          let i = 0;
          i < getAgencyPostedJobByJobTitleLocationDistance.length;
          ++i
        ) {
          centerPoint = {
            lat: getAgencyPostedJobByJobTitleLocationDistance[i].latitude,
            lng: getAgencyPostedJobByJobTitleLocationDistance[i].longitude,
          };

          n = arePointsNear(checkPoint, centerPoint, distance);

          if (n) {
            responseObj.push(getAgencyPostedJobByJobTitleLocationDistance[i]);
          }
        }

        return responseObj;
      }

      if (is_job_title_exist && is_location_exist && is_distance_exist) {
        console.log(
          "------ is_job_title_exist && is_location_exist && is_distance_exist ------"
        );

        getAgencyPostedJobByJobTitleLocationDistance =
          await context.prisma.AgencyJobPosts.findMany({
            where: {
              AND: [
                {
                  job_title: {
                    contains: job_title,
                    mode: "insensitive",
                  },
                },
                {
                  location: {
                    contains: location,
                    mode: "insensitive",
                  },
                },
              ],
            },
            orderBy: [
              {
                priority: "asc",
              },
              {
                created_at: "desc",
              },
            ],
          });

        console.log(getAgencyPostedJobByJobTitleLocationDistance);

        for (
          let i = 0;
          i < getAgencyPostedJobByJobTitleLocationDistance.length;
          ++i
        ) {
          centerPoint = {
            lat: getAgencyPostedJobByJobTitleLocationDistance[i].latitude,
            lng: getAgencyPostedJobByJobTitleLocationDistance[i].longitude,
          };

          // console.log(checkPoint, centerPoint, distance);
          n = arePointsNear(checkPoint, centerPoint, distance);
          // console.log(n);

          if (n) {
            responseObj.push(getAgencyPostedJobByJobTitleLocationDistance[i]);
          }
        }

        return responseObj;
      }

      return null;
    },

    SearchAgencyPostedJobBySectorAndEmploymentType: async (
      parent,
      args,
      context
    ) => {
      const { job_sector, employment_type, skip, take } = args;

      const sanitizedSkip = Math.max(0, parseInt(skip) || 0);
      const sanitizedTake = Math.max(0, parseInt(take) || 500);

      if (!job_sector && !employment_type) {
        return [];
      }

      const searchFilters = {};

      if (job_sector) {
        searchFilters.job_sector = {
          contains: job_sector,
          mode: "insensitive",
        };
      }

      if (employment_type) {
        searchFilters.employment_type = {
          contains: employment_type,
          mode: "insensitive",
        };
      }

      const agencyPostedJobs = await context.prisma.AgencyJobPosts.findMany({
        where: searchFilters,
        orderBy: [
          // {
          //   priority: "asc",
          // },
          {
            created_at: "desc",
          },
        ],
        skip: sanitizedSkip,
        take: sanitizedTake,
      });

      return agencyPostedJobs;
    },

    GetAgencyJobPostTemplates: async (parent, args, context) => {
      let getAgencyJobPostTemplates;

      getAgencyJobPostTemplates = await context.prisma.AgencyJobPosts.findMany({
        where: { save_as_a_template: true },
      });

      return getAgencyJobPostTemplates;
    },

    JobByJobID: async (parent, args, context) => {
      const { job_id } = args;

      if (empty(job_id)) {
        throw new UserInputError("Job id is mandatory!");
      }

      const getAllJobs = await context.prisma.Jobs.findUnique({
        where: {
          job_id: job_id,
        },
      });

      return getAllJobs;
    },

    AgencyJobPostByAgencyJobPostID: async (parent, args, context) => {
      const { agency_job_post_job_id } = args;
      //   await verifyToken(context.token);
      if (empty(agency_job_post_job_id)) {
        throw new UserInputError("Agency job id is mandatory!");
      }

      const getAgencyJobPostByAgencyJobPostID =
        await context.prisma.AgencyJobPosts.findUnique({
          where: {
            agency_job_post_job_id: agency_job_post_job_id,
          },
        });

      return getAgencyJobPostByAgencyJobPostID;
    },

    JobSeekerFAQs: async (parent, args, context) => {
      const getJobSeekerFAQs = await context.prisma.JobSeekerFAQs.findMany({});

      return getJobSeekerFAQs;
    },

    EmployerFAQs: async (parent, args, context) => {
      const getEmployerFAQs = await context.prisma.EmployerFAQs.findMany({});

      return getEmployerFAQs;
    },

    DropdownRequirements: async (parent, args, context) => {
      const getRequirements =
        await context.prisma.AgencyJobPostRequirements.findMany({});

      return getRequirements;
    },

    DropdownSkills: async (parent, args, context) => {
      const getSkills = await context.prisma.AgencyJobPostskills.findMany({});

      return getSkills;
    },
  },

  // isCompanyNameExist: async (parent, args, context) => {
  //   // const { isTokenExist } = await validate_token.token_validation(
  //   //   context.token
  //   // );

  //   // if (!isTokenExist) {
  //   //   throw new AuthenticationError("You must be logged in!");
  //   //   return null;
  //   // }

  //   const { company_name } = args;

  //   console.log(company_name);

  //   const getCompanyByCompanyName = await context.prisma.company.findMany({
  //     where: {
  //       company_name: company_name,
  //     },
  //   });

  //   console.log(getCompanyByCompanyName);

  //   if (getCompanyByCompanyName.length < 1) {
  //     return false;
  //   }

  //   return true;
  // },

  // getTeamUsersByTeamID: async (parent, args, context) => {
  //   const { user_id, team_id } = args;

  //   const getUserByUserID = await context.prisma.user.findMany({
  //     where: {
  //       user_id: user_id,
  //     },
  //   });

  //   if (getUserByUserID.length < 1) {
  //     return null;
  //   }

  //   // const company_id = getUserByUserID[0].company_id;

  //   const getTeamUsersByTeamID = await context.prisma.team_user.findMany({
  //     where: {
  //       team_id: team_id,
  //     },
  //   });

  //   return getTeamUsersByTeamID;
  // },
  // task_priority: async (parent, args, context) => {
  //   const getAllPriority = await context.prisma.task_priority.findMany();

  //   return getAllPriority;
  // },

  // getProjectTeamByProjectID: async (parent, args, context) => {
  //   const { user_id, project_id } = args;

  //   const getUserByUserID = await context.prisma.user.findMany({
  //     where: {
  //       user_id: user_id,
  //     },
  //   });

  //   if (getUserByUserID.length < 1) {
  //     return null;
  //   }

  //   // const company_id = getUserByUserID[0].company_id;

  //   const getTeamByProjectID = await context.prisma.teams.findMany({
  //     where: {
  //       project_id: project_id,
  //     },
  //   });

  //   return getTeamByProjectID;
  // },

  // AllProject: async (parent, args, context) => {
  //   const getAllProject = await context.prisma.project.findMany();

  //   // console.log(getAllProject);

  //   return getAllProject;
  // },

  // ProjectByUserID: async (parent, args, context) => {
  //   const { user_id } = args;

  //   console.log(user_id);

  //   const getUserByUserID = await context.prisma.user.findMany({
  //     where: {
  //       user_id: user_id,
  //     },
  //   });

  //   console.log(getUserByUserID);

  //   if (getUserByUserID.length < 1) {
  //     return null;
  //   }

  //   const company_id = getUserByUserID[0].company_id;

  //   console.log(company_id);

  //   const getAllProject = await context.prisma.project.findMany({
  //     where: {
  //       company_id: company_id,
  //     },
  //   });

  //   // console.log(getAllProject);

  //   return getAllProject;
  // },

  // getTeamByDesignation: async (parent, args, context) => {
  //   const { user_id, designation } = args;

  //   const getUserByUserID = await context.prisma.user.findMany({
  //     where: {
  //       user_id: user_id,
  //     },
  //   });

  //   // console.log(getUserByUserID);

  //   if (getUserByUserID.length < 1) {
  //     return null;
  //   }

  //   const company_id = getUserByUserID[0].company_id;

  //   const getTeamByDesignation = await context.prisma.user.findMany({
  //     where: {
  //       company_id: company_id,
  //       OR: designation,
  //     },
  //   });

  //   console.log(designation);

  //   console.log(getTeamByDesignation);

  //   return getTeamByDesignation;
  // },
  // getdesignationsByUserID: async (parent, args, context) => {
  //   const { user_id } = args;

  //   const getUserByUserID = await context.prisma.user.findMany({
  //     where: {
  //       user_id: user_id,
  //     },
  //   });

  //   if (getUserByUserID.length < 1) {
  //     return null;
  //   }

  //   const company_id = getUserByUserID[0].company_id;

  //   const getdesignationsByCompanyID = await context.prisma.user.findMany({
  //     where: {
  //       company_id: company_id,
  //     },
  //   });

  //   return getdesignationsByCompanyID;
  // },
  // getProjectManagersByUserID: async (parent, args, context) => {
  //   const { user_id } = args;

  //   const getUserByUserID = await context.prisma.user.findMany({
  //     where: {
  //       user_id: user_id,
  //     },
  //   });

  //   if (getUserByUserID.length < 1) {
  //     return null;
  //   }

  //   const company_id = getUserByUserID[0].company_id;

  //   const getUserByCompanyID = await context.prisma.user.findMany({
  //     where: {
  //       company_id: company_id,
  //     },
  //   });

  //   return getUserByCompanyID;
  // },

  // geocode: async (parent, args, context) => {
  //   const { address } = args;

  //   let _latitude = null;
  //   let _longitude = null;
  //   let _location = null;

  //   function timeout() {
  //     return new Promise((resolve) => {
  //       const geocode = (address, callback) => {
  //         const url =
  //           "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
  //           address +
  //           ".json?access_token=pk.eyJ1IjoiY29tcHV0ZXJzY2llbmNlYWJib3R0YWJhZCIsImEiOiJja3h6cjkyMHgwZWpxMndtOGt4N3NyZXhzIn0.qG1qpG4c4QvRplh41UnmkQ&limit=1";

  //         request({ url, json: true }, (error, { body }) => {
  //           if (error) {
  //             callback("Unable to connect to location services!", undefined);
  //           } else if (body.features.length === 0) {
  //             callback(
  //               "Unable to find location. Try another search.",
  //               undefined
  //             );
  //           } else {
  //             callback(undefined, {
  //               latitude: body.features[0].center[1],
  //               longitude: body.features[0].center[0],
  //               location: body.features[0].place_name,
  //             });
  //           }
  //         });
  //       };

  //       geocode(address, (error, { latitude, longitude, location } = {}) => {
  //         if (error) {
  //           //return res.send({ error });
  //           resolve();
  //         }

  //         // console.log("Latitude: ", latitude);
  //         // console.log("Longitude: ", longitude);
  //         // console.log("Location: ", location);

  //         _latitude = latitude;
  //         _longitude = longitude;
  //         _location = location;

  //         resolve();
  //       });
  //     });
  //   }

  //   await timeout();

  //   return {
  //     latitude: _latitude,
  //     longitude: _longitude,
  //     location: _location,
  //   };
  // },

  // addressList: async (parent, args, context) => {
  //   const { address } = args;

  //   let _location = [];

  //   function timeout() {
  //     return new Promise((resolve) => {
  //       const geocode = (address, callback) => {
  //         const url =
  //           "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
  //           address +
  //           ".json?access_token=pk.eyJ1IjoiY29tcHV0ZXJzY2llbmNlYWJib3R0YWJhZCIsImEiOiJja3h6cjkyMHgwZWpxMndtOGt4N3NyZXhzIn0.qG1qpG4c4QvRplh41UnmkQ&limit=5";

  //         request({ url, json: true }, (error, { body }) => {
  //           if (error) {
  //             callback("Unable to connect to location services!", undefined);
  //           } else if (body.features.length === 0) {
  //             callback(
  //               "Unable to find location. Try another search.",
  //               undefined
  //             );
  //           } else {
  //             callback(undefined, {
  //               location: body.features,
  //             });
  //           }
  //         });
  //       };

  //       geocode(address, (error, { location } = {}) => {
  //         if (error) {
  //           //return res.send({ error });
  //           resolve();
  //         }

  //         for (let i = 0; i < location.length; ++i) {
  //           _location.push(location[i].place_name);
  //         }

  //         // console.log(_location);

  //         resolve();
  //       });
  //     });
  //   }

  //   await timeout();

  //   return _location;
  // },

  // //----------Geo Coding End-----------------
  // document_statuses_list: async (parent, args, context) => {
  //   const getDocument_statuses_list =
  //     await context.prisma.document_statuses.findMany({});
  //   return getDocument_statuses_list;
  // },

  // listJobsByUserID: async (parent, args, context) => {
  //   const { user_id } = args;

  //   const getJobsByUserID = await context.prisma.job.findMany({
  //     where: {
  //       user_id: user_id,
  //     },
  //   });
  //   return getJobsByUserID;
  // },
  // JobByJobID: async (parent, args, context) => {
  //   const { user_id, job_id } = args;

  //   const getJobByJobID = await context.prisma.job.findMany({
  //     where: {
  //       user_id: user_id,
  //       job_id: job_id,
  //     },
  //   });
  //   return getJobByJobID;
  // },
  // JobSummary: async (parent, args, context) => {
  //   const { user_id, job_id, company_id } = args;

  //   const getJobByJobID = await context.prisma.job.findMany({
  //     where: {
  //       user_id: user_id,
  //       job_id: job_id,
  //     },
  //   });
  //   return getJobByJobID;
  // },

  // CompanyEmployeeList: async (parent, args, context) => {
  //   const { user_id, company_id } = args;

  //   const getCompanyEmployeeList = await context.prisma.user.findMany({
  //     where: {
  //       company_id: company_id,
  //       NOT: {
  //         designation: "SUPER_ADMIN",
  //       },
  //     },
  //   });
  //   return getCompanyEmployeeList;
  // },
  // contact_typeList: async (parent, args, context) => {
  //   const contact_typeList = await context.prisma.contact_type.findMany({
  //     orderBy: {
  //       dispaly_order: "asc", // asc  , desc
  //     },
  //   });
  //   return contact_typeList;
  // },
  // role_typeList: async (parent, args, context) => {
  //   const role_typeList = await context.prisma.role_type.findMany({
  //     orderBy: {
  //       dispaly_order: "asc", // asc  , desc
  //     },
  //   });
  //   return role_typeList;
  // },
  // salary_typeList: async (parent, args, context) => {
  //   const salary_typeList = await context.prisma.salary_type.findMany({
  //     orderBy: {
  //       dispaly_order: "asc", // asc  , desc
  //     },
  //   });
  //   return salary_typeList;
  // },
  // designationList: async (parent, args, context) => {
  //   const designationList = await context.prisma.designation.findMany({
  //     // orderBy: {
  //     //   dispaly_order: "asc", // asc  , desc
  //     // },
  //     where: {
  //       NOT: {
  //         title: "null",
  //       },
  //     },
  //   });

  //   let { company_id } = args;

  //   const designationListForCompany =
  //     await context.prisma.designation.findMany({
  //       where: {
  //         company_id: company_id,
  //       },
  //     });

  //   if (designationListForCompany.length > 0) {
  //     console.log("Company designation existed!");

  //     let formatArray = [];
  //     let designationForCompany = designationListForCompany[0];

  //     let designationForCompanyListingToArray =
  //       designationForCompany.listing.split(",");

  //     for (
  //       let i = 0;
  //       i < designationForCompany.listing.split(",").length;
  //       ++i
  //     ) {
  //       formatArray.push({
  //         designation_id: designationForCompany.designation_id,
  //         title: designationForCompanyListingToArray[i],
  //         listing: null,
  //         company_id: company_id,
  //       });
  //     }

  //     return designationList.concat(formatArray);
  //   } else {
  //     return designationList;
  //   }
  // },
  // departmentList: async (parent, args, context) => {
  //   const departmentList = await context.prisma.department.findMany({
  //     // orderBy: {
  //     //   dispaly_order: "asc", // asc  , desc
  //     // },
  //     where: {
  //       NOT: {
  //         title: "null",
  //       },
  //     },
  //   });

  //   //console.log(departmentList);

  //   let { company_id } = args;

  //   const departmentListForCompany = await context.prisma.department.findMany(
  //     {
  //       where: {
  //         company_id: company_id,
  //       },
  //     }
  //   );

  //   if (departmentListForCompany.length > 0) {
  //     console.log("Company departments existed!");

  //     let formatArray = [];
  //     let departmentForCompany = departmentListForCompany[0];

  //     let deparmentForCompanyListingToArray =
  //       departmentForCompany.listing.split(",");

  //     for (
  //       let i = 0;
  //       i < departmentForCompany.listing.split(",").length;
  //       ++i
  //     ) {
  //       formatArray.push({
  //         department_id: departmentForCompany.department_id,
  //         title: deparmentForCompanyListingToArray[i],
  //         listing: null,
  //         company_id: company_id,
  //       });
  //     }

  //     return departmentList.concat(formatArray);
  //   } else {
  //     return departmentList;
  //   }
  // },

  // Dashboard: async (parent, args, context) => {
  //   let inactive_companies = await context.prisma.company.findMany({
  //     where: { is_company_approved: false, is_deleted: false },
  //   });

  //   let active_companies = await context.prisma.company.findMany({
  //     where: { is_company_approved: true, is_deleted: false },
  //   });

  //   let total_companies = await context.prisma.company.findMany({
  //     where: { is_deleted: false },
  //   });

  //   return {
  //     inactive_companies: inactive_companies.length,
  //     active_companies: active_companies.length,
  //     total_companies: total_companies.length,
  //   };
  // },
  // IsCompanyActive: async (parent, args, context) => {
  //   const { user_id, company_id } = args;
  //   //     is_company_approved Boolean?             @default(false)
  //   // subscription_id     String               @db.Uuid
  //   // is_payment_done     Boolean?             @default(false)

  //   let IsCompanyActive = await context.prisma.company.findMany({
  //     where: { company_id: company_id, is_company_approved: true },
  //   });

  //   if (IsCompanyActive.length > 0) {
  //     return true;
  //   }

  //   return false;
  // },
  // inActiveEmployerList: async (parent, args, context) => {
  //   //     is_company_approved Boolean?             @default(false)
  //   // subscription_id     String               @db.Uuid
  //   // is_payment_done     Boolean?             @default(false)

  //   let getInactiveCompanies = await context.prisma.company.findMany({
  //     where: { is_company_approved: false, is_deleted: false },
  //   });

  //   return getInactiveCompanies;
  // },

  // subscription_planList: async (parent, args, context) => {
  //   const subscription_planList =
  //     await context.prisma.subscription_plan.findMany({
  //       orderBy: {
  //         dispaly_order: "asc", // asc  , desc
  //       },
  //     });
  //   return subscription_planList;
  // },

  // fillDropdowns: async (parent, args, context) => {
  //   const document_statuses =
  //     await context.prisma.document_statuses.findMany();

  //   const department = await context.prisma.department.findMany();

  //   const task_priority = await context.prisma.task_priority.findMany();

  //   const contact_type = await context.prisma.contact_type.findMany();

  //   const designation = await context.prisma.designation.findMany();

  //   const role_type = await context.prisma.role_type.findMany();

  //   const salary_type = await context.prisma.salary_type.findMany();

  //   const subscription_plan =
  //     await context.prisma.subscription_plan.findMany();
  //   const channelList = await context.prisma.channel.findMany();
  //   const addressTypeList = await context.prisma.address_type.findMany();
  //   const industryTypeList = await context.prisma.industry_type.findMany();
  //   const course = await context.prisma.course.findMany();
  //   const skill = await context.prisma.skill.findMany();
  //   const institute_university =
  //     await context.prisma.institute_university.findMany();

  //   const project_status = await context.prisma.project_status.findMany();

  //   const course_type = await context.prisma.course_type.findMany();
  //   const education_levelList =
  //     await context.prisma.education_level.findMany();

  //   let fillDropdowns;
  //   let returnObject = "filled";

  //   if (task_priority.length < 1) {
  //     fillDropdowns = await context.prisma.task_priority.createMany({
  //       data: [
  //         {
  //           priority_id: "e9296c23-ac04-45c3-80a9-ca9bb600b875",
  //           short_description: "Low",
  //           dispaly_order: 1,
  //         },
  //         {
  //           priority_id: "13e6b96e-3deb-481e-9252-f44394cc7cd7",
  //           short_description: "Medium",
  //           dispaly_order: 2,
  //         },
  //         {
  //           priority_id: "e5d5457e-5381-4b8a-849a-2c53d0b439b0",
  //           short_description: "High",
  //           dispaly_order: 3,
  //         },
  //       ],
  //     });
  //   } else {
  //     returnObject += " | task_priority: already exists ";
  //   }

  //   if (project_status.length < 1) {
  //     fillDropdowns = await context.prisma.project_status.createMany({
  //       data: [
  //         {
  //           guid_: "b50b61c2-faf1-434a-bdbb-3b7e4a54a662",
  //           short_description: "Overdue",
  //         },
  //         {
  //           guid_: "f27266fa-5569-4a88-ab53-e97626867a9a",
  //           short_description: "Ongoing",
  //         },
  //         {
  //           guid_: "b80c5d86-0305-432a-a14d-f1a4e072cbd9",
  //           short_description: "Completed",
  //         },
  //       ],
  //     });
  //   } else {
  //     returnObject += " | project_status: already exists ";
  //   }

  //   if (document_statuses.length < 1) {
  //     fillDropdowns = await context.prisma.document_statuses.createMany({
  //       data: [
  //         {
  //           guid: "ebc1faab-e11e-4f46-a857-d41b26195813",
  //           status: "Approved",
  //         },
  //         {
  //           guid: "08a9dd4b-b735-45c2-96a1-caa04b992b54",
  //           status: "Not Approved",
  //         },
  //         {
  //           guid: "e7583ea3-5e32-4c46-a3b7-ebfdb2f9989d",
  //           status: "Pending Approval",
  //         },
  //       ],
  //     });
  //   } else {
  //     returnObject += " | document_statuses: already exists ";
  //   }

  //   if (contact_type.length < 1) {
  //     fillDropdowns = await context.prisma.contact_type.createMany({
  //       data: [
  //         {
  //           contact_type_id: "e2c1b080-7bde-4ac0-aa1c-bccd72f26b4b",
  //           title: "Mobile",
  //           dispaly_order: 1,
  //         },
  //         {
  //           contact_type_id: "cbd34151-8a57-40f9-a2d7-bb9ae278ac6e",
  //           title: "Landline",
  //           dispaly_order: 2,
  //         },
  //         {
  //           contact_type_id: "69b0cd0c-ec67-4846-9f88-522891a22f6d",
  //           title: "Other",
  //           dispaly_order: 3,
  //         },
  //       ],
  //     });
  //   } else {
  //     returnObject += " | Contact_type: already exists ";
  //   }

  //   if (department.length < 1) {
  //     fillDropdowns = await context.prisma.department.createMany({
  //       data: [
  //         {
  //           department_id: "109a242e-8099-4fac-8099-bfb373265406",
  //           title: "Administration",
  //           //dispaly_order: 1,
  //         },
  //         {
  //           department_id: "5fb4c968-dc2d-45d9-a5d4-fd00b1645af6",
  //           title: "Marketing",
  //           //dispaly_order: 1,
  //         },
  //         {
  //           department_id: "eadf8b39-05f4-4697-a613-469930701b50",
  //           title: "Human Resources",
  //           // dispaly_order: 1,
  //         },
  //       ],
  //     });
  //   } else {
  //     returnObject += " | Department: already exists ";
  //   }

  //   if (designation.length < 1) {
  //     fillDropdowns = await context.prisma.designation.createMany({
  //       data: [
  //         {
  //           designation_id: "5d8e4ede-b820-4aab-a761-ddcd0858574f",
  //           title: "Operating Officer",
  //           dispaly_order: 1,
  //         },
  //         {
  //           designation_id: "30678522-5cf2-49de-b056-d0e00494a165",
  //           title: "Financial Officer",
  //           dispaly_order: 2,
  //         },
  //         {
  //           designation_id: "01c28b0c-a523-4d00-a712-71c3db6d1a0b",
  //           title: "Technology Officer",
  //           dispaly_order: 3,
  //         },
  //       ],
  //     });
  //   } else {
  //     returnObject += " | Designation: already exists ";
  //   }

  //   if (role_type.length < 1) {
  //     fillDropdowns = await context.prisma.role_type.createMany({
  //       data: [
  //         {
  //           role_type_id: "e80fbf97-35df-48cf-bd50-77c6c7acbf89",
  //           title: "BUSINESS",
  //           dispaly_order: 1,
  //         },
  //         // {
  //         //   role_type_id: "53f7df5c-8765-4c11-91be-e5e32fd01041",
  //         //   title: "BASIC",
  //         //   dispaly_order: 1,
  //         // },
  //         // {
  //         //   role_type_id: "0e9cccb8-8704-4f4b-848a-b86691704bf0",
  //         //   title: "BASIC",
  //         //   dispaly_order: 1,
  //         // },
  //       ],
  //     });
  //   } else {
  //     returnObject += " | Role Type: already exists ";
  //   }

  //   if (salary_type.length < 1) {
  //     fillDropdowns = await context.prisma.salary_type.createMany({
  //       data: [
  //         {
  //           salary_type_id: "afa32587-354f-42a3-9a96-b2e1464e6e7b",
  //           title: "Hourly",
  //           dispaly_order: 1,
  //         },
  //         {
  //           salary_type_id: "523f8415-df23-459c-b925-6f87bfb8e90a",
  //           title: "Daily",
  //           dispaly_order: 2,
  //         },
  //         {
  //           salary_type_id: "962ea8ac-ee3c-4f42-8b24-7701afb2e54d",
  //           title: "Monthly",
  //           dispaly_order: 3,
  //         },
  //         {
  //           salary_type_id: "bd174991-8452-4e07-9e18-fea6faa51f06",
  //           title: "Yearly",
  //           dispaly_order: 4,
  //         },
  //       ],
  //     });
  //   } else {
  //     returnObject += " | Salary Type: already exists ";
  //   }

  //   if (subscription_plan.length < 1) {
  //     fillDropdowns = await context.prisma.subscription_plan.createMany({
  //       data: [
  //         {
  //           subscription_id: "3a834b28-0382-11ed-b939-0242ac120002",
  //           subscription_name: "BASIC",
  //           price: 500,
  //           dispaly_order: 1,
  //         },
  //         {
  //           subscription_id: "47b1e2a0-0382-11ed-b939-0242ac120002",
  //           subscription_name: "STANDARD",
  //           price: 700,
  //           dispaly_order: 2,
  //         },
  //         {
  //           subscription_id: "4d47522c-0382-11ed-b939-0242ac120002",
  //           subscription_name: "PREMIUM",
  //           price: 1200,
  //           dispaly_order: 3,
  //         },
  //       ],
  //     });
  //   } else {
  //     returnObject += " | Subscription Plans: already exists ";
  //   }

  //   if (skill.length < 1) {
  //     fillDropdowns = await context.prisma.skill.createMany({
  //       data: [
  //         {
  //           skill_id: "f8a84ced-f2aa-40c9-aa82-ac88776f1fa5",
  //           skill_name: "Leadership",
  //         },
  //         {
  //           skill_id: "01118071-622d-4d69-99a6-10dbb1869582",
  //           skill_name: "Active Listener",
  //         },
  //         {
  //           skill_id: "2345f570-1bbe-441c-b017-4a7b82168422",
  //           skill_name: "Computer Proficiency",
  //         },
  //         {
  //           skill_id: "dcacc143-e68a-4cc9-bfe1-7616aa3c8eb2",
  //           skill_name: "Callaboration Talent",
  //         },
  //       ],
  //     });
  //   } else {
  //     returnObject += " | skill: already exists ";
  //   }

  //   if (institute_university.length < 1) {
  //     fillDropdowns = await context.prisma.institute_university.createMany({
  //       data: [
  //         {
  //           guid: "e8601b94-81cc-4796-8ff4-1962f91292d0",
  //           short_description: "University of Oxford",
  //         },
  //         {
  //           guid: "6c5423cd-4c28-4b69-9c84-0948a2789db7",
  //           short_description: "Stanford University",
  //         },
  //         {
  //           guid: "becd375f-378a-437d-a5fd-d54f523d611c",
  //           short_description: "University of Cambridge",
  //         },
  //         {
  //           guid: "92f4435b-f2cd-4256-8f80-3c3b640d3a5c",
  //           short_description: "Harvard University",
  //         },
  //       ],
  //     });
  //   } else {
  //     returnObject += " | university: already exists ";
  //   }

  //   if (course_type.length < 1) {
  //     fillDropdowns = await context.prisma.course_type.createMany({
  //       data: [
  //         {
  //           guid: "65d440ce-a86e-411d-89ac-2ac153a05d4d",
  //           short_description: "Research",
  //         },
  //         {
  //           guid: "09621a6f-d940-42d3-83c3-d437f48156c6",
  //           short_description: "Field Work",
  //         },
  //         {
  //           guid: "6bfbc047-8d28-4cba-9f96-70657be7a113",
  //           short_description: "Community Work",
  //         },
  //       ],
  //     });
  //   } else {
  //     returnObject += " | course type: already exists ";
  //   }

  //   if (course.length < 1) {
  //     fillDropdowns = await context.prisma.course.createMany({
  //       data: [
  //         {
  //           guid: "5c4ea1a3-69c4-49b4-a086-9b7d8db7209e",
  //           short_description: "Computer Science",
  //         },
  //         {
  //           guid: "649a9a40-24df-45d2-be46-b86e65e30ad5",
  //           short_description: "Software Engineering",
  //         },
  //         {
  //           guid: "af8e63c9-7786-45fe-806e-8ab8d2c13b7b",
  //           short_description: "Civil Engineering",
  //         },
  //         {
  //           guid: "2561a75a-5a99-4711-8411-33ee7fdb0ea6",
  //           short_description: "Electrical Engineering",
  //         },
  //       ],
  //     });
  //   } else {
  //     returnObject += " | course: already exists ";
  //   }

  //   if (education_levelList.length < 1) {
  //     fillDropdowns = await context.prisma.education_level.createMany({
  //       data: [
  //         {
  //           guid: "ecf83d3f-67ee-42fa-b381-f8250bcf8205",
  //           short_description: "Bachelor's",
  //         },
  //         {
  //           guid: "cb6214a1-139d-4c76-a4d1-477f20750bc8",
  //           short_description: "Master's",
  //         },
  //         {
  //           guid: "d99dcf11-25bb-46e2-ae25-88c65737f2bc",
  //           short_description: "PhD",
  //         },
  //         {
  //           guid: "34a43324-b24d-4930-a67a-345d73a9ba2f",
  //           short_description: "Diploma",
  //         },
  //       ],
  //     });
  //   } else {
  //     returnObject += " | education level: already exists ";
  //   }

  //   if (channelList.length < 1) {
  //     fillDropdowns = await context.prisma.channel.createMany({
  //       data: [
  //         {
  //           channel_id: "1a93184c-ee1b-11ec-8ea0-0242ac120002",
  //           channel_name: "Facebook",
  //         },
  //         {
  //           channel_id: "2407ab9a-ee1b-11ec-8ea0-0242ac120002",
  //           channel_name: "LinkedIn",
  //         },
  //         {
  //           channel_id: "2ac8560a-ee1b-11ec-8ea0-0242ac120002",
  //           channel_name: "Twitter",
  //         },
  //         {
  //           channel_id: "320e20a2-ee1b-11ec-8ea0-0242ac120002",
  //           channel_name: "Website",
  //         },
  //       ],
  //     });
  //   } else {
  //     returnObject += " | channel: already exists ";
  //   }

  //   if (addressTypeList.length < 1) {
  //     fillDropdowns = await context.prisma.address_type.createMany({
  //       data: [
  //         {
  //           guid: "6dd78998-ee1b-11ec-8ea0-0242ac120002",
  //           address_type_name: "Head Office",
  //         },
  //         {
  //           guid: "7379549e-ee1b-11ec-8ea0-0242ac120002",
  //           address_type_name: "Branch Office",
  //         },
  //       ],
  //     });
  //   } else {
  //     returnObject += " | address_type: already exists ";
  //   }

  //   if (industryTypeList.length < 1) {
  //     fillDropdowns = await context.prisma.industry_type.createMany({
  //       data: [
  //         {
  //           guid: "3df7ace0-ebcc-11ec-8ea0-0242ac120002",
  //           industry_type_name: "Information Technology",
  //         },
  //         {
  //           guid: "b2d214ca-ebcb-11ec-8ea0-0242ac120002",
  //           industry_type_name: "Chemical",
  //         },
  //         {
  //           guid: "c6da15ce-b935-4240-b564-6935eb3f5de5",
  //           industry_type_name: "Construction",
  //         },
  //       ],
  //     });
  //   } else {
  //     returnObject += " | industry_type: already exists ";
  //   }

  //   // const deleteChannels = await context.prisma.channel.deleteMany({});
  //   // const deleteAddressTypes = await context.prisma.address_type.deleteMany(
  //   //   {}
  //   // );
  //   // const deleteIndustryTypes = await context.prisma.industry_type.deleteMany(
  //   //   {}
  //   // );

  //   return returnObject;
  // },
  // courseList: async (parent, args, context) => {
  //   const courseList = await context.prisma.course.findMany();
  //   return courseList;
  // },
  // course_typeList: async (parent, args, context) => {
  //   const course_typeList = await context.prisma.course_type.findMany();
  //   return course_typeList;
  // },

  // education_levelList: async (parent, args, context) => {
  //   const education_levelList =
  //     await context.prisma.education_level.findMany();
  //   return education_levelList;
  // },
  // institute_universityList: async (parent, args, context) => {
  //   const institute_universityList =
  //     await context.prisma.institute_university.findMany();
  //   return institute_universityList;
  // },

  // skillList: async (parent, args, context) => {
  //   const skillList = await context.prisma.skill.findMany();
  //   return skillList;
  // },
  // channelList: async (parent, args, context) => {
  //   const channelList = await context.prisma.channel.findMany();
  //   return channelList;
  // },
  // addressTypeList: async (parent, args, context) => {
  //   const addressTypeList = await context.prisma.address_type.findMany();
  //   return addressTypeList;
  // },
  // industryTypeList: async (parent, args, context) => {
  //   const industryTypeList = await context.prisma.industry_type.findMany();
  //   return industryTypeList;
  // },

  // projectStatus: async (parent, args, context) => {
  //   let getProjectStatus = await context.prisma.project_status.findMany();

  //   return getProjectStatus;
  // },

  //   CompanyProfile: async (parent, args, context) => {
  //     let { user_id, company_id } = args;
  //     let getCompany = await context.prisma.company.findUnique({
  //       where: { company_id: company_id },
  //     });

  //     if (!getCompany) {
  //       return null;
  //     }

  //     return getCompany;

  //     // let responseObject = {};
  //     // responseObject.company_name = getCompany.company_name;
  //     // responseObject.GST_number = getCompany.GST_number;
  //     // responseObject.corporation_no = getCompany.corporation_no;
  //     // responseObject.emails = [];
  //     // responseObject.contact_nos = [];
  //     // responseObject.channels = [];
  //     // responseObject.addresses = [];

  //     // //------------- Get Emails------------------

  //     // let getCompanyEmails = await context.prisma.company_email.findMany({
  //     //   where: { company_id: company_id },
  //     // });

  //     // if (getCompanyEmails.length > 0) {
  //     //   for (let i = 0; i < getCompanyEmails.length; ++i) {
  //     //     responseObject.emails.push(getCompanyEmails[i].email);
  //     //   }
  //     // }

  //     // //------------- Get contact_nos------------------

  //     // let getCompanyContactNos =
  //     //   await context.prisma.company_contact_no.findMany({
  //     //     where: { company_id: company_id },
  //     //   });

  //     // if (getCompanyContactNos.length > 0) {
  //     //   for (let i = 0; i < getCompanyContactNos.length; ++i) {
  //     //     responseObject.contact_nos.push(getCompanyContactNos[i].contact_no);
  //     //   }
  //     // }

  //     // //------------- Get channels------------------

  //     // let getCompanyChannels = await context.prisma.company_channel.findMany({
  //     //   where: { company_id: company_id },
  //     // });

  //     // if (getCompanyChannels.length > 0) {
  //     //   for (let i = 0; i < getCompanyChannels.length; ++i) {
  //     //     responseObject.channels.push({
  //     //       channel_id: getCompanyChannels[i].channel_id,
  //     //       url: getCompanyChannels[i].url,
  //     //     });
  //     //   }
  //     // }

  //     // //------------- Get addresses------------------

  //     // let getCompanyaddresses = await context.prisma.company_address.findMany({
  //     //   where: { company_id: company_id },
  //     // });

  //     // let getAddressType;
  //     // if (getCompanyaddresses.length > 0) {
  //     //   for (let i = 0; i < getCompanyaddresses.length; ++i) {
  //     //     getAddressType = await context.prisma.address_type.findUnique({
  //     //       where: { guid: getCompanyaddresses[i].address_type_id },
  //     //     });

  //     //     // console.log(getAddressType);
  //     //     // console.log(getCompanyaddresses[i].address_type_id);

  //     //     responseObject.addresses.push({
  //     //       address_type_id: getCompanyaddresses[i].address_type_id,
  //     //       address_type_name: getAddressType.address_type_name,
  //     //       street_no: getCompanyaddresses[i].street_no,
  //     //       country: getCompanyaddresses[i].country,
  //     //       province: getCompanyaddresses[i].province,
  //     //       city: getCompanyaddresses[i].city,
  //     //       postal_zip_code: getCompanyaddresses[i].postal_zip_code,
  //     //     });
  //     //   }
  //     // }

  //     // // console.log(responseObject);
  //     return responseObject;
  //   },

  //   // mark
  //   EmployeeProfile: async (parent, args, context) => {
  //     const { user_id } = args;
  //     //const { userTypeFromToken, userIdFromToken } = context;
  //     // if (user_id !== userIdFromToken) {
  //     //   throw new AuthenticationError("You must be logged in!");
  //     // }

  //     let getUser = await context.prisma.user.findUnique({
  //       where: { user_id: user_id },
  //     });
  //     // console.log(getUser);

  //     if (!getUser) {
  //       return null;
  //     }

  //     return getUser;
  //   },
  // },
  // // mark2

  // Jobs: {
  //   jobRequirements: async (job, args, context) => {
  //     // console.log("------------------------------------------");
  //     // console.log(project.company_id);
  //     // console.log("------------------------------------------");
  //     if (job.job_id) {
  //       let getJobRequirements = await context.prisma.JobRequirements.findMany({
  //         where: { job_id: job.job_id },
  //       });

  //       // console.log("==============================================");
  //       // console.log(getCompany);
  //       return getJobRequirements;
  //     } else {
  //       return null;
  //     }
  //   },

  //   jobSkills: async (job, args, context) => {
  //     // console.log("------------------------------------------");
  //     // console.log(project.company_id);
  //     // console.log("------------------------------------------");
  //     if (job.job_id) {
  //       let getJobSkills = await context.prisma.JobSkills.findMany({
  //         where: { job_id: job.job_id },
  //       });

  //       // console.log("==============================================");
  //       // console.log(getCompany);
  //       return getJobSkills;
  //     } else {
  //       return null;
  //     }
  //   },
  // },
  AgencyJobPosts: {
    job: async (AgencyJobPosts, args, context) => {
      // console.log("------------------------------------------");
      // console.log(project.company_id);
      // console.log("------------------------------------------");

      if (AgencyJobPosts.job_id) {
        let getCandidates = await context.prisma.Jobs.findMany({
          where: {
            job_id: AgencyJobPosts.job_id,
          },
        });

        return getCandidates[0];
      } else {
        return null;
      }
    },

    candidates: async (AgencyJobPosts, args, context) => {
      // console.log("------------------------------------------");
      // console.log(project.company_id);
      // console.log("------------------------------------------");

      if (AgencyJobPosts.agency_job_post_job_id) {
        let getCandidates = await context.prisma.Candidates.findMany({
          where: {
            agency_job_post_job_id: AgencyJobPosts.agency_job_post_job_id,
            is_job_link: true,
          },
          orderBy: { created_at: "desc" },
        });

        // console.log("==============================================");
        // console.log(getCompany);
        return getCandidates;
      } else {
        return null;
      }
    },

    agencyJobPostRequirements: async (AgencyJobPosts, args, context) => {
      // console.log("------------------------------------------");
      // console.log(project.company_id);
      // console.log("------------------------------------------");

      if (AgencyJobPosts.agency_job_post_job_id) {
        let getAgencyJobPostRequirements =
          await context.prisma.AgencyJobPostRequirements.findMany({
            where: {
              agency_job_post_job_id: AgencyJobPosts.agency_job_post_job_id,
            },
          });

        // console.log("==============================================");
        // console.log(getCompany);
        return getAgencyJobPostRequirements;
      } else {
        return null;
      }
    },

    agencyJobPostskills: async (AgencyJobPosts, args, context) => {
      // console.log("------------------------------------------");
      // console.log(project.company_id);
      // console.log("------------------------------------------");

      if (AgencyJobPosts.agency_job_post_job_id) {
        let getAgencyJobPostskills =
          await context.prisma.AgencyJobPostskills.findMany({
            where: {
              agency_job_post_job_id: AgencyJobPosts.agency_job_post_job_id,
            },
          });

        // console.log("==============================================");
        // console.log(getCompany);
        return getAgencyJobPostskills;
      } else {
        return null;
      }
    },
  },
  // project: {
  //   company: async (project, args, context) => {
  //     // console.log("------------------------------------------");
  //     // console.log(project.company_id);
  //     // console.log("------------------------------------------");
  //     if (project.company_id) {
  //       let getCompany = await context.prisma.company.findMany({
  //         where: { company_id: project.company_id },
  //       });

  //       // console.log("==============================================");
  //       // console.log(getCompany);
  //       return getCompany[0];
  //     } else {
  //       return null;
  //     }
  //   },
  //   tasks: async (project, args, context) => {
  //     // console.log("------------------------------------------");
  //     // console.log(project.company_id);
  //     // console.log("------------------------------------------");
  //     if (project.guid) {
  //       let getTask = await context.prisma.tasks.findMany({
  //         where: { project_id: project.guid },
  //       });

  //       // console.log("==============================================");
  //       // console.log(getCompany);
  //       return getTask;
  //     } else {
  //       return null;
  //     }
  //   },

  //   industry_type: async (project, args, context) => {
  //     //industry_type_id
  //     if (project.industry_type_id) {
  //       let getindustry_type = await context.prisma.industry_type.findMany({
  //         where: { guid: project.industry_type_id },
  //       });

  //       return getindustry_type;
  //     } else {
  //       return null;
  //     }
  //   },

  //   project_status: async (project, args, context) => {
  //     //industry_type_id
  //     if (project.project_status_id) {
  //       let getproject_status = await context.prisma.project_status.findMany({
  //         where: { guid_: project.project_status_id },
  //       });

  //       return getproject_status;
  //     } else {
  //       return null;
  //     }
  //   },

  //   project_documents: async (project, args, context) => {
  //     //industry_type_id
  //     if (project.guid) {
  //       let project_documents = await context.prisma.project_documents.findMany(
  //         {
  //           where: { project_id: project.guid },
  //         }
  //       );

  //       return project_documents;
  //     } else {
  //       return null;
  //     }
  //   },
  // },

  // tasks: {
  //   teams: async (tasks, args, context) => {
  //     // console.log("------------------------------------------");
  //     // console.log(project.company_id);
  //     // console.log("------------------------------------------");
  //     if (tasks.team_id) {
  //       let getTeams = await context.prisma.teams.findMany({
  //         where: { guid: tasks.team_id },
  //       });

  //       // console.log("==============================================");
  //       // console.log(getCompany);
  //       return getTeams;
  //     } else {
  //       return null;
  //     }
  //   },
  // },

  // teams: {
  //   team_user: async (teams, args, context) => {
  //     // console.log("------------------------------------------");
  //     // console.log(project.company_id);
  //     // console.log("------------------------------------------");
  //     if (teams.guid) {
  //       let getUser = await context.prisma.team_user.findMany({
  //         where: { team_id: teams.guid },
  //       });

  //       // console.log("==============================================");
  //       // console.log(getCompany);
  //       return getUser;
  //     } else {
  //       return null;
  //     }
  //   },
  // },

  // team_user: {
  //   user: async (team_user, args, context) => {
  //     if (team_user.user_id) {
  //       let getUserByTeam = await context.prisma.user.findUnique({
  //         where: { user_id: team_user.user_id },
  //       });

  //       return getUserByTeam;
  //     } else {
  //       return null;
  //     }
  //   },
  // },

  // out_getTeamUsersByTeamID: {
  //   user: async (team_user, args, context) => {
  //     if (team_user.user_id) {
  //       let getUserByTeam = await context.prisma.user.findUnique({
  //         where: { user_id: team_user.user_id },
  //       });

  //       return getUserByTeam;
  //     } else {
  //       return null;
  //     }
  //   },

  //   teams: async (team_user, args, context) => {
  //     if (team_user.team_id) {
  //       let getTeamByTeamUser = await context.prisma.teams.findMany({
  //         where: { guid: team_user.team_id },
  //       });

  //       return getTeamByTeamUser;
  //     } else {
  //       return null;
  //     }
  //   },
  // },
  // job: {
  //   education_level: async (job, args, context) => {
  //     // console.log(company);

  //     let getEducationLevel = await context.prisma.education_level.findUnique({
  //       where: { guid: job.education_level_id },
  //     });

  //     return getEducationLevel;
  //   },
  // },
  // out_User_Employee_Profile: {
  //   user_address: async (user, args, context) => {
  //     // console.log(company);

  //     let getUseraddresses = await context.prisma.user_address.findMany({
  //       where: { user_id: user.user_id, is_deleted: false },
  //     });

  //     return getUseraddresses;
  //   },

  //   user_channel: async (user, args, context) => {
  //     // console.log(company);

  //     let getUserChannel = await context.prisma.user_channel.findMany({
  //       where: { user_id: user.user_id, is_deleted: false },
  //     });

  //     return getUserChannel;
  //   },

  //   user_contact: async (user, args, context) => {
  //     // console.log(company);

  //     let getUserContact = await context.prisma.user_contact.findMany({
  //       where: { user_id: user.user_id, is_deleted: false },
  //     });

  //     return getUserContact;
  //   },

  //   //ttttttttttttttt
  //   user_document: async (user, args, context) => {
  //     // console.log(company);

  //     let ExtensionList = [
  //       "jpg",
  //       "png",
  //       "gif",
  //       "tif",
  //       "webp",
  //       "bmp",
  //       "svg",
  //     ];
  //     let _is_image;

  //     let getUserDocument = await context.prisma.user_document.findMany({
  //       where: { user_id: user.user_id },
  //     });

  //     for (let i = 0; i < getUserDocument.length; ++i) {
  //       if (
  //         ExtensionList.includes(
  //           getUserDocument[i].extension.toLowerCase()
  //         )
  //       ) {
  //         _is_image = true;
  //       } else {
  //         _is_image = false;
  //       }

  //       getUserDocument[i].is_image = _is_image;
  //     }

  //     return getUserDocument;
  //   },

  //   user_eductaion: async (user, args, context) => {
  //     // console.log(company);

  //     let getUserEducation = await context.prisma.user_eductaion.findMany({
  //       where: { user_id: user.user_id },
  //     });

  //     return getUserEducation;
  //   },

  //   user_email: async (user, args, context) => {
  //     // console.log(company);

  //     let getUserEmail = await context.prisma.user_email.findMany({
  //       where: { user_id: user.user_id, is_deleted: false },
  //     });

  //     return getUserEmail;
  //   },

  //   user_emergency_contact: async (user, args, context) => {
  //     // console.log(company);

  //     let getUserEmergencyContact =
  //       await context.prisma.user_emergency_contact.findMany({
  //         where: { user_id: user.user_id },
  //       });

  //     return getUserEmergencyContact;
  //   },

  //   user_portfolio: async (user, args, context) => {
  //     // console.log(company);

  //     let getUserPortfolio = await context.prisma.user_portfolio.findMany({
  //       where: { user_id: user.user_id, is_deleted: false },
  //     });

  //     return getUserPortfolio;
  //   },

  //   user_skill: async (user, args, context) => {
  //     // console.log(company);

  //     let getUserSkill = await context.prisma.user_skill.findMany({
  //       where: { user_id: user.user_id },
  //     });

  //     return getUserSkill;
  //   },
  // },
  // user_address: {
  //   address_type: async (user_address, args, context) => {
  //     // console.log(company);

  //     if (!user_address.address_type_id) {
  //       return null;
  //     }

  //     let getUserAddressType = await context.prisma.address_type.findUnique({
  //       where: { guid: user_address.address_type_id },
  //     });

  //     return getUserAddressType;
  //   },
  // },
  // user_channel: {
  //   channel: async (user_channel, args, context) => {
  //     // console.log(company);

  //     // if (!user_channel.channel_id) {
  //     //   return null;
  //     // }

  //     let getUserChannel = await context.prisma.channel.findUnique({
  //       where: { channel_id: user_channel.channel_id },
  //     });

  //     return getUserChannel;
  //   },
  // },
  // user_eductaion: {
  //   industry_type: async (user_eductaion, args, context) => {
  //     if (!user_eductaion.industry_type_id) {
  //       return null;
  //     }
  //     let getUserEducationIndustryType =
  //       await context.prisma.industry_type.findMany({
  //         where: { guid: user_eductaion.industry_type_id, is_deleted: false },
  //       });

  //     return getUserEducationIndustryType[0];
  //   },
  // },
  // user_skill: {
  //   skill: async (user_skill, args, context) => {
  //     // console.log(company);

  //     // if (!user_channel.channel_id) {
  //     //   return null;
  //     // }

  //     let getUserSkill = await context.prisma.skill.findUnique({
  //       where: { skill_id: user_skill.skill_id },
  //     });

  //     return getUserSkill;
  //   },
  // },
  // Company: {
  //   company_address: async (company, args, context) => {
  //     // console.log(company);

  //     let getCompanyaddresses = await context.prisma.company_address.findMany({
  //       where: { company_id: company.company_id, is_deleted: false },
  //     });

  //     return getCompanyaddresses;
  //   },

  //   company_channel: async (company, args, context) => {
  //     // console.log(company);

  //     let getCompanyChannels = await context.prisma.company_channel.findMany({
  //       where: { company_id: company.company_id, is_deleted: false },
  //     });

  //     return getCompanyChannels;
  //   },

  //   company_contact_no: async (company, args, context) => {
  //     // console.log(company);

  //     let getCompanyContactNos =
  //       await context.prisma.company_contact_no.findMany({
  //         where: { company_id: company.company_id, is_deleted: false },
  //       });

  //     return getCompanyContactNos;
  //   },

  //   company_document: async (company, args, context) => {
  //     // console.log(company);

  //     let ExtensionList = [
  //       "jpg",
  //       "png",
  //       "gif",
  //       "tif",
  //       "webp",
  //       "bmp",
  //       "svg",
  //     ];
  //     let _is_image;

  //     let getCompanyDocuments = await context.prisma.company_document.findMany({
  //       where: { company_id: company.company_id },
  //     });

  //     for (let i = 0; i < getCompanyDocuments.length; ++i) {
  //       if (
  //         ExtensionList.includes(
  //           getCompanyDocuments[i].extension.toLowerCase()
  //         )
  //       ) {
  //         _is_image = true;
  //       } else {
  //         _is_image = false;
  //       }

  //       getCompanyDocuments[i].is_image = _is_image;
  //     }

  //     return getCompanyDocuments;
  //   },

  //   company_email: async (company, args, context) => {
  //     // console.log(company);

  //     let getCompanyEmails = await context.prisma.company_email.findMany({
  //       where: { company_id: company.company_id, is_deleted: false },
  //     });

  //     return getCompanyEmails;
  //   },

  //   company_portfolio: async (company, args, context) => {
  //     // console.log(company);

  //     let getCompanyPortfolio = await context.prisma.company_portfolio.findMany(
  //       {
  //         where: { company_id: company.company_id, is_deleted: false },
  //       }
  //     );

  //     return getCompanyPortfolio;
  //   },
  //   industry_type: async (company, args, context) => {
  //     if (!company.industry_type_id) {
  //       return null;
  //     }
  //     let getCompanyIndustryType = await context.prisma.industry_type.findMany({
  //       where: { guid: company.industry_type_id, is_deleted: false },
  //     });

  //     return getCompanyIndustryType[0];
  //   },
  // },
  // company_address: {
  //   address_type: async (company_address, args, context) => {
  //     // console.log(company);

  //     if (!company_address.address_type_id) {
  //       return null;
  //     }

  //     let getCompanyAddressType = await context.prisma.address_type.findUnique({
  //       where: { guid: company_address.address_type_id },
  //     });

  //     return getCompanyAddressType;
  //   },
  // },
  // company_channel: {
  //   channel: async (company_channel, args, context) => {
  //     // console.log(company);

  //     if (!company_channel.channel_id) {
  //       return null;
  //     }

  //     let getCompanyChannel = await context.prisma.channel.findUnique({
  //       where: { channel_id: company_channel.channel_id },
  //     });

  //     return getCompanyChannel;
  //   },
  // },
  // Incident: {
  //   severity: async (parent, args, context) => {
  //     //console.log(parent);

  //     console.log(parent);
  //     if (!parent.severityId) {
  //       return null;
  //     }
  //     const severityId = parent.severityId;

  //     //   const svrty = await context.prisma.severity.findUnique({
  //     //     where: { severityId: incdnt.severityId },
  //     //   });

  //     const svrty = await context.prisma.severity.findUnique({
  //       where: { severityId: severityId },
  //     });
  //     return svrty;
  //   },
  //   documents: async (parent, args, context) => {
  //     const { incidentId } = parent;

  //     console.log("document");

  //     const dcmnt = await context.prisma.document.findMany({
  //       where: { incidentId: incidentId, isDeleted: false },
  //       orderBy: { createdAt: "desc" },
  //     });
  //     console.log(dcmnt);
  //     return dcmnt;
  //   },
  //   components: async (parent, args, context) => {
  //     const { incidentId } = parent;

  //     console.log(parent.components);

  //     const cmptnt = await context.prisma.components.findMany({
  //       where: { incidentId: incidentId, isDeleted: false },
  //       orderBy: { createdAt: "desc" },
  //     });

  //     return cmptnt;
  //   },
  //   transferChains: async (parent, args, context) => {
  //     const { incidentId } = parent;

  //     const trnschn = await context.prisma.TransferChain.findMany({
  //       where: { incidentId: incidentId, isDeleted: false },
  //       orderBy: { createdAt: "desc" },
  //     });

  //     return trnschn;
  //   },
  //   businessOwners: async (parent, args, context) => {
  //     const incidentId = parent.incidentId;
  //     const userId = parent.incidentOwner;

  //     const bsnsownrs = await context.prisma.BusinessOwners.findMany({
  //       where: { isDeleted: false, incidentId: incidentId, userId: userId },
  //     });

  //     return bsnsownrs;
  //   },
  //   contactReferences: async (parent, args, context) => {
  //     const incidentId = parent.incidentId;
  //     const userId = parent.incidentOwner;

  //     const cntctrefrnc = await context.prisma.ContactReference.findMany({
  //       where: { isDeleted: false, incidentId: incidentId, userId: userId },
  //     });

  //     return cntctrefrnc;
  //   },
  //   emails: async (parent, args, context) => {
  //     const incidentId = parent.incidentId;
  //     const userId = parent.incidentOwner;

  //     const eml = await context.prisma.email.findMany({
  //       where: { incidentId: incidentId, userId: userId },
  //       orderBy: { createdAt: "desc" },
  //     });

  //     return eml;
  //   },
  //   notes: async (parent, args, context) => {
  //     const incidentId = parent.incidentId;
  //     const userId = parent.incidentOwner;

  //     const nts = await context.prisma.Note.findMany({
  //       where: { incidentId: incidentId, userId: userId, isDeleted: false },
  //       orderBy: { createdAt: "desc" },
  //     });

  //     return nts;
  //   },
  //   SMSs: async (parent, args, context) => {
  //     const incidentId = parent.incidentId;
  //     const userId = parent.incidentOwner;

  //     const sms = await context.prisma.SMS.findMany({
  //       where: { incidentId: incidentId, userId: userId },
  //       orderBy: { createdAt: "desc" },
  //     });

  //     return sms;
  //   },
  // },

  // incidentByOwner: {
  //   severity: async (parent, args, context) => {
  //     //console.log(parent);

  //     if (!parent.severityId) {
  //       return null;
  //     }
  //     const severityId = parent.severityId;

  //     //   const svrty = await context.prisma.severity.findUnique({
  //     //     where: { severityId: incdnt.severityId },
  //     //   });

  //     const svrty = await context.prisma.severity.findUnique({
  //       where: { severityId: severityId },
  //     });
  //     return svrty;
  //   },
  //   documents: async (parent, args, context) => {
  //     const { incidentId } = parent;

  //     const dcmnt = await context.prisma.document.findMany({
  //       where: { incidentId: incidentId, isDeleted: false },
  //       orderBy: { createdAt: "desc" },
  //     });
  //     return dcmnt;
  //   },
  //   components: async (parent, args, context) => {
  //     const { incidentId } = parent;

  //     console.log(parent.components);

  //     const cmptnt = await context.prisma.components.findMany({
  //       where: { incidentId: incidentId, isDeleted: false },
  //       orderBy: { createdAt: "desc" },
  //     });

  //     return cmptnt;
  //   },
  //   transferChains: async (parent, args, context) => {
  //     const { incidentId } = parent;

  //     const trnschn = await context.prisma.TransferChain.findMany({
  //       where: { incidentId: incidentId, isDeleted: false },
  //       orderBy: { createdAt: "desc" },
  //     });

  //     return trnschn;
  //   },
  //   businessOwners: async (parent, args, context) => {
  //     const incidentId = parent.incidentId;
  //     const userId = parent.incidentOwner;

  //     const bsnsownrs = await context.prisma.BusinessOwners.findMany({
  //       where: { isDeleted: false, incidentId: incidentId, userId: userId },
  //     });

  //     return bsnsownrs;
  //   },
  //   contactReferences: async (parent, args, context) => {
  //     const incidentId = parent.incidentId;
  //     const userId = parent.incidentOwner;

  //     const cntctrefrnc = await context.prisma.ContactReference.findMany({
  //       where: { isDeleted: false, incidentId: incidentId, userId: userId },
  //     });

  //     return cntctrefrnc;
  //   },
  //   emails: async (parent, args, context) => {
  //     const incidentId = parent.incidentId;
  //     const userId = parent.incidentOwner;

  //     const eml = await context.prisma.email.findMany({
  //       where: { incidentId: incidentId, userId: userId },
  //       orderBy: { createdAt: "desc" },
  //     });

  //     return eml;
  //   },
  //   notes: async (parent, args, context) => {
  //     const incidentId = parent.incidentId;
  //     const userId = parent.incidentOwner;

  //     const nts = await context.prisma.Note.findMany({
  //       where: { incidentId: incidentId, userId: userId, isDeleted: false },
  //       orderBy: { createdAt: "desc" },
  //     });

  //     return nts;
  //   },
  //   SMSs: async (parent, args, context) => {
  //     const incidentId = parent.incidentId;
  //     const userId = parent.incidentOwner;

  //     const sms = await context.prisma.SMS.findMany({
  //       where: { incidentId: incidentId, userId: userId },
  //       orderBy: { createdAt: "desc" },
  //     });

  //     return sms;
  //   },
  // },
  // Components: {
  //   tag: async (parent, args, context) => {
  //     console.log(parent);
  //     const { tagId } = parent;

  //     const tg = await context.prisma.tags.findMany({
  //       where: { tagId: tagId },
  //       orderBy: { createdAt: "desc" },
  //     });
  //     return tg[0];
  //   },
  // },
  // Emails: {
  //   emailDocuments: async (parent, args, context) => {
  //     console.log(parent);
  //     const { emailId } = parent;

  //     const emlDoc = await context.prisma.emailDocuments.findMany({
  //       where: { emailId: emailId },
  //       orderBy: { createdAt: "desc" },
  //     });
  //     return emlDoc;
  //   },
  // },

  Mutation: {
    //pp

    // Test: async (parent, args, context) => {
    //   await verifyToken(context.token);

    //   return {};
    // },
    contactUs: async (parent, args, context) => {
      const { first_name, last_name, email, phone_number, message } = args;

      let emailBody;

      if (phone_number && phone_number.length > 3) {
        emailBody = `
        Dear Support Team,
        
        Name: ${first_name} ${last_name}
        Email: ${email}
        Phone No: ${phone_number}

        Message: ${message}
        
        Thank you for your assistance.
        
        Best regards,
        ${first_name}
        `;
      } else {
        emailBody = `
        Dear Support Team,
        
        Name: ${first_name} ${last_name}
        Email: ${email}

        Message: ${message}
        
        Thank you for your assistance.
        
        Best regards,
        ${first_name}
        `;
      }

      // send mail with defined transport object
      let mailOptions = {
        from: "contact@abc.com",
        to: "contact@abc.com",
        subject: "Contact Us",
        text: emailBody,
      };

      const emailResponse = await sendEmail(mailOptions);
      console.log(emailResponse);

      mailOptions = {
        from: "contact@job-port.ca",
        to: email,
        subject: "Contact Us",
        text: emailResponse.message,
      };

      console.log("Feedback Email Response:");
      const emailResponseFeedbackEmail = await sendEmail(mailOptions);
      console.log(emailResponseFeedbackEmail);

      // return the response to the GraphQL client
      return { success: emailResponse.success, message: emailResponse.message };
    },

    signup: async (parent, args, context) => {
      const getUser = await context.prisma.Users.findMany({});

      if (getUser.length < 1) {
        console.log("User doesnot exist!");

        const createUser = await context.prisma.Users.create({
          data: { ...args },
        });

        console.log("New user created!");

        // counters updation

        let fillCounters;

        fillCounters = await context.prisma.UniqueKeyCountCandidates.deleteMany(
          {}
        );
        fillCounters =
          await context.prisma.UniqueKeyCountAgencyJobPosts.deleteMany({});
        fillCounters = await context.prisma.UniqueKeyCountJobs.deleteMany({});

        console.log("All counter deleted!");

        fillCounters = await context.prisma.EmployerFAQs.deleteMany({});
        fillCounters = await context.prisma.JobSeekerFAQs.deleteMany({});

        console.log("All faqs deleted!");

        fillCounters = await context.prisma.UniqueKeyCountCandidates.createMany(
          {
            data: [
              {
                id: 1,
                counter: 10000,
                start_from: 10000,
              },
            ],
          }
        );

        fillCounters =
          await context.prisma.UniqueKeyCountAgencyJobPosts.createMany({
            data: [
              {
                id: 1,
                counter: 10000,
                start_from: 10000,
              },
            ],
          });

        fillCounters = await context.prisma.UniqueKeyCountJobs.createMany({
          data: [
            {
              id: 1,
              counter: 10000,
              start_from: 10000,
            },
          ],
        });

        console.log("All counter created!");

        fillCounters = await context.prisma.EmployerFAQs.createMany({
          data: [
            {
              guid: "29d1ff03-dc5d-4ffc-9857-e14035304eb8",
              question: "How long have we been in the business?",
              answer:
                "Our management team collectively has over 45 years of experience in the industry.",
            },
            {
              guid: "617a55f9-998b-43bc-8a6c-325ea74bdd62",
              question:
                "Why we do it? Our values-Our goals for the Employer and the Employee?",
              answer:
                "We provide opportunity, a significant number of our team members are immigrants to Canada or have parent(s)/ grandparent(s) who have immigrated so we understand the struggle of coming to a new country.`We provide opportunities for our staff and clients.`We provide a cost effective & reliable services so they may focus on running their business.",
            },
            {
              guid: "679b642f-ffa0-44d3-b443-4589b66b8a28",
              question: "What makes us different from other agencies?",
              answer:
                "We look for long term partnerships. We want to grow alongside our clients, and will make decisions based on what is best for you.`Service is our main goal.",
            },
            {
              guid: "68b2eb66-e7ef-44c1-a569-649c17affd2f",
              question: "How we ensure we get the job done?",
              answer:
                "We have dedicated teams handling individual accounts. If your company is faced with unforeseen issues regarding staff shortage, we can resolve them quickly.",
            },
            {
              guid: "a5d6d14e-b72d-44cb-9bd5-c748e8b720da",
              question: "Negotiable Mark-up rates? (IS THIS A THING?)",
              answer:
                "Depending on contract sizes, our mark-ups are always negotiable.",
            },
            {
              guid: "e842f276-1484-4b4a-a97c-620183049c25",
              question: "What other companies do we have on board with us?",
              answer:
                "One of the largest Personal Care product private label/ co-manufacturers in North America.`One of the largest Beverage/ Liquid private label and co-manufacturers in North America.`One of the largest dairy producers in North America.`One of the largest Salty Snack private/ co manufacturers (former).`Leading food service / food packaging plastics company.",
            },
            {
              guid: "ef6198fa-4789-4513-a7bb-39c538b36220",
              question: "Who are we?",
              answer:
                "We are a staffing solutions company who provide temporary, temp to hire and direct placement staffing services.`We have over 15 years of experience.`We specialize in food/beverage manufacturers.",
            },
          ],
        });

        console.log("Employer faqs created!");

        return createUser;
      } else {
        console.log("User already exists!");
        return getUser;
      }
    },

    DeleteJobSeekerFAQByID: async (parent, args, context) => {
      const { guid } = args;
      let deleteJobSeekerFAQ;

      if (empty(guid)) {
        throw new UserInputError("Incorrect guid!");
      }

      try {
        deleteJobSeekerFAQ = await context.prisma.JobSeekerFAQs.delete({
          where: {
            guid: guid,
          },
        });
      } catch (e) {
        throw new UserInputError("Please fill out all the mandatory fields!");
      }

      return deleteJobSeekerFAQ;
    },

    UpdateAgencyJobPostPriority: async (parent, args, context) => {
      const { agency_job_post_job_id, priority } = args;
      await verifyToken(context.token);
      if (empty(agency_job_post_job_id) || empty(priority)) {
        throw new UserInputError("Please fill out all the mandatory fields!");
      }

      let updateAgencyJobPostPriority;
      try {
        updateAgencyJobPostPriority =
          await context.prisma.AgencyJobPosts.update({
            where: {
              agency_job_post_job_id: agency_job_post_job_id,
            },
            data: {
              priority: priority,
            },
          });
      } catch (e) {
        throw new UserInputError("Invalid input!");
      }

      return updateAgencyJobPostPriority;
    },

    DeleteEmployerFAQByID: async (parent, args, context) => {
      const { guid } = args;

      if (empty(guid)) {
        throw new UserInputError("Please fill out all the mandatory fields!");
      }

      let deleteEmployerFAQ;
      try {
        deleteEmployerFAQ = await context.prisma.EmployerFAQs.delete({
          where: {
            guid: guid,
          },
        });
      } catch (e) {
        throw new UserInputError("Invalid input!");
      }

      return deleteEmployerFAQ;
    },

    DeleteAgencyPostedJobByID: async (parent, args, context) => {
      const { agency_job_post_job_id } = args;
      await verifyToken(context.token);
      if (empty(agency_job_post_job_id)) {
        throw new UserInputError("Please fill out all the mandatory fields!");
      }

      let deleteAgencyJobPostRequirements;
      let deleteAgencyJobPostskills;
      let deleteCandidates;
      let deleteAgencyPosted;
      let transaction;

      try {
        deleteAgencyJobPostRequirements =
          await context.prisma.AgencyJobPostRequirements.deleteMany({
            where: {
              agency_job_post_job_id: agency_job_post_job_id,
            },
          });
      } catch (e) {
        console.log("Requirements not found!");
        // throw new UserInputError("Invalid input!");
      }

      try {
        deleteAgencyJobPostskills =
          await context.prisma.AgencyJobPostskills.deleteMany({
            where: {
              agency_job_post_job_id: agency_job_post_job_id,
            },
          });
      } catch (e) {
        console.log("Skills not found!");
        // throw new UserInputError("Invalid input!");
      }

      try {
        deleteCandidates = await context.prisma.Candidates.deleteMany({
          where: {
            agency_job_post_job_id: agency_job_post_job_id,
          },
        });
      } catch (e) {
        console.log("Candidates not found!");
        // throw new UserInputError("Invalid input!");
      }

      try {
        deleteAgencyPosted = await context.prisma.AgencyJobPosts.delete({
          where: {
            agency_job_post_job_id: agency_job_post_job_id,
          },
        });

        // transaction = await context.prisma.$transaction([
        //   deleteAgencyJobPostRequirements,
        //   deleteAgencyJobPostskills,
        //   deleteCandidates,
        //   deleteAgencyPosted,
        // ]);
      } catch (e) {
        console.log("Error in AgencyJobPosts!");
        throw new UserInputError("Invalid input!");
      }

      return deleteAgencyPosted;
    },

    DeleteJobByID: async (parent, args, context) => {
      const { job_id } = args;

      if (empty(job_id)) {
        throw new UserInputError("Please fill out all the mandatory fields!");
      }

      let deleteJob;

      try {
        deleteJob = await context.prisma.Jobs.delete({
          where: {
            job_id: job_id,
          },
        });
      } catch (e) {
        throw new UserInputError("Invalid input!");
      }

      return deleteJob;
    },

    DeleteCandidateByID: async (parent, args, context) => {
      const { candidate_id } = args;

      if (empty(candidate_id)) {
        throw new UserInputError("Please fill out all the mandatory fields!");
      }

      let deleteCandidate;

      try {
        deleteCandidate = await context.prisma.Candidates.delete({
          where: {
            candidate_id: candidate_id,
          },
        });
      } catch (e) {
        throw new UserInputError("Invalid input!");
      }

      return deleteCandidate;
    },

    // om3
    AddJob: async (parent, args, context) => {
      const {
        company_name,
        company_logo,
        company_details_phone_number,
        website_link,
        address,
        city,
        state,
        country,
        zip_code,
        // ----------------------------
        first_name,
        middle_name,
        last_name,
        email,
        company_admin_contact_number,
        // ----------------------------

        // language,
        // // country,
        // // company_name,
        // location,
        // // working_location,
        // job_title,
        // // job_sector,
        // // job_description,
        // // required_qualification,
        // // requirements,
        // // start_date,
        // // start_time,
        // // start_time_zone,
        // // end_time,
        // // end_time_zone,
        // // pay_rate,
        // // pay_rate_currency,
        // no_of_resources_required,
        // skills,

        job_title,
        job_type,
        additional_details,
        no_of_resources_required,
        job_description_file,

        safety_shoes,
        safety_gloves,
        safety_jacket,
      } = args;

      const copyOfArgs = { ...args };

      if (
        empty(company_name) ||
        empty(company_details_phone_number) ||
        empty(address) ||
        empty(city) ||
        empty(state) ||
        empty(country) ||
        empty(zip_code) ||
        empty(first_name) ||
        empty(last_name) ||
        empty(email) ||
        empty(company_admin_contact_number) ||
        empty(job_type)
      ) {
        throw new UserInputError("Please fill out all the mandatory fields!");
      }

      let ExtensionList = [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "tif",
        "webp",
        "bmp",
        "svg",
        "pdf",
        "doc",
        "docx",
        "csv",
        "xlsx",
        "xlsm",
        "xlsb",
        "xltx",
      ];

      let is_valid_extension;

      //=============================Company Logo=============================================
      console.log("Before logo");

      if (company_logo) {
        const { createReadStream, filename, mimetype, encoding } =
          await company_logo;

        const stream = createReadStream();

        let arr = filename.split(".");

        let name = arr[0];
        let ext = arr.pop();

        if (ExtensionList.includes(ext.toLowerCase())) {
          is_valid_extension = true;
        } else {
          is_valid_extension = false;
        }

        if (!is_valid_extension) {
          throw new ValidationError("Invalid logo extension!");
        }

        let url = path.join(`${name}-${Date.now()}.${ext}`);

        const s3 = new AWS.S3({
          accessKeyId: "AKIsdfsfDFdfgdfgGDFGsfsDSGdfgDFGEIH4", // Access key ID
          secretAccesskey: "J2eZER3h8dsdfgdfgdfg45454545345345bfh", // Secret access key
        });

        function company_logo_upload() {
          return new Promise(async (resolve) => {
            const params = {
              Bucket: "backend-staging-bucket/company-logos", //backend-staging-bucket
              Key: url,
              Body: stream,
              ContentType: mimetype,
            };

            // Uploading files to the bucket
            s3.upload(params, function (err, data) {
              if (err) {
                //throw err;
                console.log(err);
                return "failure";
              }
              console.log(
                `Company logo uploaded successfully. ${data.Location}`
              );
              args.company_logo = data.Location;
              resolve();
            });
          });
        }

        await company_logo_upload();
      }

      console.log("After logo upload");

      //==========================================================================

      //=============================job_description_file=============================================
      console.log("Before job_description_file");

      if (job_description_file) {
        const { createReadStream, filename, mimetype, encoding } =
          await job_description_file;

        const stream = createReadStream();

        let arr = filename.split(".");

        let name = arr[0];
        let ext = arr.pop();

        if (ExtensionList.includes(ext.toLowerCase())) {
          is_valid_extension = true;
        } else {
          is_valid_extension = false;
        }

        if (!is_valid_extension) {
          throw new ValidationError("Invalid job description file extension!");
        }

        let url = path.join(`${name}-${Date.now()}.${ext}`);

        const s3 = new AWS.S3({
          accessKeyId: "AKIsdfsfDFGDFGsfsDSGdfgDFGEIH4", // Access key ID
          secretAccesskey: "J2eZER3h8dsdfgdfgdfg45454545345345bfh", // Secret access key
        });

        function job_description_file_upload() {
          return new Promise(async (resolve) => {
            const params = {
              Bucket: "backend-staging-bucket/job-description-files", //backend-staging-bucket
              Key: url,
              Body: stream,
              ContentType: mimetype,
            };

            // Uploading files to the bucket
            s3.upload(params, function (err, data) {
              if (err) {
                //throw err;
                console.log(err);
                return "failure";
              }
              console.log(
                `Company logo uploaded successfully. ${data.Location}`
              );
              args.job_description_file = data.Location;
              resolve();
            });
          });
        }

        await job_description_file_upload();
      }

      console.log("After job_description_file");

      //==========================================================================

      //mykey ---------------------------------------------------------------------------
      let auto_generated_key = "empty";
      const getUniqueCount = await context.prisma.UniqueKeyCountJobs.findUnique(
        {
          where: {
            id: 1,
          },
        }
      );

      auto_generated_key = parseInt(getUniqueCount.counter);
      args.job_id = auto_generated_key;

      const updateUniqueCount = await context.prisma.UniqueKeyCountJobs.update({
        where: {
          id: 1,
        },
        data: {
          counter: auto_generated_key + 1,
        },
      });

      //mykey ---------------------------------------------------------------------------

      // try {
      const addJob = await context.prisma.Jobs.create({
        data: { ...args },
      });
      // } catch (err) {
      //   throw new ValidationError(err);
      // }

      const createdJobID = addJob.job_id;

      // let loopEntry;

      // if (skills && skills.length > 0) {
      //   for (let i = 0; i < skills.length; ++i) {
      //     loopEntry = await context.prisma.JobSkills.create({
      //       data: { job_id: createdJobID, description: skills[i] },
      //     });
      //   }

      //   console.log("skills added!");
      // }

      // if (requirements && requirements.length > 0) {
      //   for (let i = 0; i < requirements.length; ++i) {
      //     loopEntry = await context.prisma.JobRequirements.create({
      //       data: { job_id: createdJobID, description: requirements[i] },
      //     });
      //   }
      //   console.log("requirements added!");
      // }

      return copyOfArgs;
    },

    ApplyJob: async (parent, args, context) => {
      const {
        agency_job_post_job_id,
        first_name,
        middle_name,
        last_name,
        email,
        phone_number,
        city,
        job_sector,
        resume,
      } = args;

      if (
        empty(agency_job_post_job_id) ||
        empty(first_name) ||
        empty(last_name) ||
        empty(email) ||
        empty(phone_number) ||
        empty(city) ||
        empty(job_sector) ||
        empty(resume)
      ) {
        throw new UserInputError("Please fill out all the mandatory fields!");
      }

      let ExtensionList = [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "tif",
        "webp",
        "bmp",
        "svg",
        "pdf",
        "doc",
        "docx",
        "csv",
        "xlsx",
        "xlsm",
        "xlsb",
        "xltx",
      ];

      let is_valid_extension;

      //============================= resume =============================================
      console.log("Before resume");

      if (resume) {
        const { createReadStream, filename, mimetype, encoding } = await resume;

        const stream = createReadStream();

        let arr = filename.split(".");

        let name = arr[0];
        let ext = arr.pop();

        if (ExtensionList.includes(ext.toLowerCase())) {
          is_valid_extension = true;
        } else {
          is_valid_extension = false;
        }

        if (!is_valid_extension) {
          throw new ValidationError("Invalid resume extension!");
        }

        let url = path.join(`${name}-${Date.now()}.${ext}`);

        const s3 = new AWS.S3({
          accessKeyId: "AKIsdfsfDFGDFGsfsDSGdfgDFGEIH4", // Access key ID
          secretAccesskey: "J2eZER3h8dsdfgdfgdfg45454545345345bfh", // Secret access key
        });

        function candidate_resume_upload() {
          return new Promise(async (resolve) => {
            const params = {
              Bucket: "backend-staging-bucket/resumes-with-job-association", //backend-staging-bucket
              Key: url,
              Body: stream,
              ContentType: mimetype,
            };

            // Uploading files to the bucket
            s3.upload(params, function (err, data) {
              if (err) {
                //throw err;
                console.log(err);
                return "failure";
              }
              console.log(
                `Condidate resume uploaded successfully. ${data.Location}`
              );
              args.resume = data.Location;
              resolve();
            });
          });
        }

        await candidate_resume_upload();
      }

      console.log("After resume upload");

      //==========================================================================

      //mykey ---------------------------------------------------------------------------
      let auto_generated_key = "empty";
      const getUniqueCount =
        await context.prisma.UniqueKeyCountCandidates.findUnique({
          where: {
            id: 1,
          },
        });

      auto_generated_key = parseInt(getUniqueCount.counter);
      args.candidate_id = auto_generated_key;

      const updateUniqueCount =
        await context.prisma.UniqueKeyCountCandidates.update({
          where: {
            id: 1,
          },
          data: {
            counter: auto_generated_key + 1,
          },
        });

      //mykey ---------------------------------------------------------------------------

      // try {
      const applyJob = await context.prisma.Candidates.create({
        data: { ...args },
      });
      // } catch (err) {
      //   throw new ValidationError(err);
      // }

      return applyJob;
    },

    ApplyWithoutJob: async (parent, args, context) => {
      const {
        first_name,
        middle_name,
        last_name,
        email,
        phone_number,
        city,
        job_sector,
        resume,
      } = args;

      if (
        empty(first_name) ||
        empty(last_name) ||
        empty(email) ||
        empty(phone_number) ||
        empty(city) ||
        empty(job_sector) ||
        empty(resume)
      ) {
        throw new UserInputError("Please fill out all the mandatory fields!");
      }

      args.is_job_link = false;

      let ExtensionList = [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "tif",
        "webp",
        "bmp",
        "svg",
        "pdf",
        "doc",
        "docx",
        "csv",
        "xlsx",
        "xlsm",
        "xlsb",
        "xltx",
      ];

      let is_valid_extension;

      //============================= resume =============================================
      console.log("Before resume");

      if (resume) {
        const { createReadStream, filename, mimetype, encoding } = await resume;

        const stream = createReadStream();

        let arr = filename.split(".");

        let name = arr[0];
        let ext = arr.pop();

        if (ExtensionList.includes(ext.toLowerCase())) {
          is_valid_extension = true;
        } else {
          is_valid_extension = false;
        }

        if (!is_valid_extension) {
          throw new ValidationError("Invalid resume extension!");
        }

        let url = path.join(`${name}-${Date.now()}.${ext}`);

        const s3 = new AWS.S3({
          accessKeyId: "AKIsdfsfDFGDFGsfsDSGdfgDFGEIH4", // Access key ID
          secretAccesskey: "J2eZER3h8dsdfgdfgdfg45454545345345bfh", // Secret access key
        });

        function candidate_resume_upload() {
          return new Promise(async (resolve) => {
            const params = {
              Bucket: "backend-staging-bucket/resumes-without-job-association", //backend-staging-bucket
              Key: url,
              Body: stream,
              ContentType: mimetype,
            };

            // Uploading files to the bucket
            s3.upload(params, function (err, data) {
              if (err) {
                //throw err;
                console.log(err);
                return "failure";
              }
              console.log(
                `Condidate resume uploaded successfully. ${data.Location}`
              );
              args.resume = data.Location;
              resolve();
            });
          });
        }

        await candidate_resume_upload();
      }

      console.log("After resume upload");

      //==========================================================================

      //mykey ---------------------------------------------------------------------------
      let auto_generated_key = "empty";
      const getUniqueCount =
        await context.prisma.UniqueKeyCountCandidates.findUnique({
          where: {
            id: 1,
          },
        });

      auto_generated_key = parseInt(getUniqueCount.counter);
      args.candidate_id = auto_generated_key;

      const updateUniqueCount =
        await context.prisma.UniqueKeyCountCandidates.update({
          where: {
            id: 1,
          },
          data: {
            counter: auto_generated_key + 1,
          },
        });

      //mykey ---------------------------------------------------------------------------

      // try {
      const applyJob = await context.prisma.Candidates.create({
        data: { ...args },
      });
      // } catch (err) {
      //   throw new ValidationError(err);
      // }

      return applyJob;
    },

    AddJobSeekerFAQ: async (parent, args, context) => {
      const { question, answer } = args;

      if (empty(question) || empty(answer)) {
        throw new UserInputError("Please fill out all the mandatory fields!");
      }

      let addJobSeekerFAQ = await context.prisma.JobSeekerFAQs.create({
        data: { ...args },
      });

      return addJobSeekerFAQ;
    },

    AddEmployerFAQ: async (parent, args, context) => {
      const { question, answer } = args;

      if (empty(question) || empty(answer)) {
        throw new UserInputError("Please fill out all the mandatory fields!");
      }

      let addEmployerFAQ = await context.prisma.EmployerFAQs.create({
        data: { ...args },
      });

      return addEmployerFAQ;
    },

    //om1
    AgencyJobPost: async (parent, args, context) => {
      const {
        job_id,
        language,
        country,
        company_name,
        location,
        working_location,
        job_title,
        job_sector,
        job_description,
        required_qualification,
        requirements,
        start_date,
        start_time,
        start_time_zone,
        end_time,
        end_time_zone,
        pay_rate,
        pay_rate_currency,
        no_of_resources_required,
        skills,
        save_as_a_template,
        priority,
        safety_shoes,
        safety_gloves,
        safety_jacket,
      } = args;
      await verifyToken(context.token);
      if (!priority) {
        args.priority = 1;
      }

      if (
        empty(language) ||
        empty(country) ||
        empty(company_name) ||
        empty(location) ||
        empty(job_title) ||
        empty(job_description) ||
        empty(job_sector) ||
        empty(no_of_resources_required)
      ) {
        throw new UserInputError("Please fill out all the mandatory fields!");
      }

      if (args.hasOwnProperty("start_date")) {
        if (args.start_date === "") {
          console.log("start_date condition true");
          args.start_date = null;
        }
      }

      if (args.hasOwnProperty("start_time")) {
        if (args.start_time === "") {
          console.log("start_time condition true");
          args.start_time = null;
        }
      }

      if (args.hasOwnProperty("end_time")) {
        console.log("Yes end_time exist");
        if (args.end_time === "") {
          console.log("end_time condition true");
          args.end_time = null;
        }
      }

      if (job_id) {
        const getJobByJobID = await context.prisma.Jobs.findMany({
          where: {
            job_id: job_id,
          },
        });

        if (getJobByJobID.length < 1) {
          return null;
        }

        // om2

        // if(getJobByJobID[0].is_posted === true){
        //   throw new UserInputError("Job already posted!");
        // }

        // Update is_posted field
        console.log("Update the Jobs table field 'is_posted' = 'true'");
        const updateJob = await context.prisma.Jobs.update({
          where: {
            job_id: job_id,
          },
          data: {
            is_posted: true,
          },
        });
        //End Update is_posted field
      }

      const copyOfArgs = { ...args };

      let coordinateObj = await FindGeographicCoordinate(
        location + ", " + country
      );

      // console.log(coordinateObj);

      if (
        coordinateObj.hasOwnProperty("latitude") &&
        coordinateObj.hasOwnProperty("longitude")
      ) {
        args.latitude = coordinateObj.latitude;
        args.longitude = coordinateObj.longitude;
      }

      delete args.requirements;
      delete args.skills;

      //mykey ---------------------------------------------------------------------------
      let auto_generated_key = "empty";
      const getUniqueCount =
        await context.prisma.UniqueKeyCountAgencyJobPosts.findUnique({
          where: {
            id: 1,
          },
        });

      auto_generated_key = parseInt(getUniqueCount.counter);
      args.agency_job_post_job_id = auto_generated_key;

      const updateUniqueCount =
        await context.prisma.UniqueKeyCountAgencyJobPosts.update({
          where: {
            id: 1,
          },
          data: {
            counter: auto_generated_key + 1,
          },
        });

      //mykey ---------------------------------------------------------------------------

      let addAgencyJobPost = await context.prisma.AgencyJobPosts.create({
        data: { ...args },
      });

      let created_agency_job_post_job_id =
        addAgencyJobPost.agency_job_post_job_id;

      console.log("AgencyJobPost added!");

      let loopEntry;

      if (requirements && requirements.length > 0) {
        for (let i = 0; i < requirements.length; ++i) {
          loopEntry = await context.prisma.AgencyJobPostRequirements.create({
            data: {
              agency_job_post_job_id: created_agency_job_post_job_id,
              description: requirements[i],
            },
          });
        }

        console.log("requirements added!");
      }

      if (skills && skills.length > 0) {
        for (let i = 0; i < skills.length; ++i) {
          loopEntry = await context.prisma.AgencyJobPostskills.create({
            data: {
              agency_job_post_job_id: created_agency_job_post_job_id,
              description: skills[i],
            },
          });
        }

        console.log("skills added!");
      }

      return copyOfArgs;
    },

    UpdateAgencyJobPost: async (parent, args, context) => {
      const {
        agency_job_post_job_id,
        language,
        country,
        company_name,
        location,
        working_location,
        job_title,
        job_sector,
        job_description,
        required_qualification,
        requirements,
        start_date,
        start_time,
        start_time_zone,
        end_time,
        end_time_zone,
        pay_rate,
        pay_rate_currency,
        no_of_resources_required,
        skills,
        save_as_a_template,
        priority,
        safety_shoes,
        safety_gloves,
        safety_jacket,
      } = args;

      if (
        empty(agency_job_post_job_id) ||
        empty(language) ||
        empty(country) ||
        empty(company_name) ||
        empty(location) ||
        empty(job_title) ||
        empty(job_description) ||
        empty(job_sector) ||
        empty(no_of_resources_required)
      ) {
        throw new UserInputError("Please fill out all the mandatory fields!");
      }

      const getAgencyJobPost = await context.prisma.AgencyJobPosts.findMany({
        where: {
          agency_job_post_job_id: agency_job_post_job_id,
        },
      });

      if (getAgencyJobPost.length < 1) {
        throw new UserInputError("Invalid input!");
      }

      if (!priority) {
        args.priority = 3;
      }

      if (args.hasOwnProperty("start_date")) {
        if (args.start_date === "") {
          console.log("start_date condition true");
          args.start_date = null;
        }
      }

      if (args.hasOwnProperty("start_time")) {
        if (args.start_time === "") {
          console.log("start_time condition true");
          args.start_time = null;
        }
      }

      if (args.hasOwnProperty("end_time")) {
        console.log("Yes end_time exist");
        if (args.end_time === "") {
          console.log("end_time condition true");
          args.end_time = null;
        }
      }

      const copyOfArgs = { ...args };

      let coordinateObj = await FindGeographicCoordinate(
        location + ", " + country
      );

      // console.log(coordinateObj);

      if (
        coordinateObj.hasOwnProperty("latitude") &&
        coordinateObj.hasOwnProperty("longitude")
      ) {
        args.latitude = coordinateObj.latitude;
        args.longitude = coordinateObj.longitude;
      }

      delete args.requirements;
      delete args.skills;
      delete args.agency_job_post_job_id;

      let addAgencyJobPost = await context.prisma.AgencyJobPosts.update({
        where: {
          agency_job_post_job_id: agency_job_post_job_id,
        },
        data: { ...args },
      });

      console.log("AgencyJobPost updated!");

      let loopEntry;

      if (requirements && requirements.length > 0) {
        loopEntry = await context.prisma.AgencyJobPostRequirements.deleteMany({
          where: {
            agency_job_post_job_id: agency_job_post_job_id,
          },
        });

        for (let i = 0; i < requirements.length; ++i) {
          loopEntry = await context.prisma.AgencyJobPostRequirements.create({
            data: {
              agency_job_post_job_id: agency_job_post_job_id,
              description: requirements[i],
            },
          });
        }

        console.log("requirements added!");
      }

      if (skills && skills.length > 0) {
        loopEntry = await context.prisma.AgencyJobPostskills.deleteMany({
          where: {
            agency_job_post_job_id: agency_job_post_job_id,
          },
        });

        for (let i = 0; i < skills.length; ++i) {
          loopEntry = await context.prisma.AgencyJobPostskills.create({
            data: {
              agency_job_post_job_id: agency_job_post_job_id,
              description: skills[i],
            },
          });
        }

        console.log("skills added!");
      }

      return copyOfArgs;
    },

    // AddTask: async (parent, args, context) => {
    //   const {
    //     user_id,
    //     team_id,
    //     task_priority_id,
    //     task_definition,
    //     is_project_location,
    //     work_location,
    //     task_manager_id,
    //     task_start_date,
    //     task_end_date,
    //     salary,
    //     company_name,
    //     task_user,
    //   } = args;

    //   delete args.user_id;
    //   delete args.work_location;
    //   delete args.company_name;
    //   delete args.task_user;

    //   const getUserByUserID = await context.prisma.user.findMany({
    //     where: {
    //       user_id: user_id,
    //     },
    //   });

    //   if (getUserByUserID.length < 1) {
    //     throw new ValidationError("User doesnot exist!");
    //     // return null;
    //   }

    //   let createTask = await context.prisma.tasks.create({
    //     data: { ...args },
    //   });

    //   const guid = createTask.guid;

    //   if (!is_project_location) {
    //     work_location.task_id = guid;
    //     let createTaskAddress = await context.prisma.task_address.create({
    //       data: { ...work_location },
    //     });
    //   }

    //   //------------ Team User ---------------

    //   let createTaskUser;
    //   if (task_user && task_user.length > 0) {
    //     for (let i = 0; i < task_user.length; ++i) {
    //       if (getTeam.length < 1) {
    //         createTaskUser = await context.prisma.task_user.create({
    //           data: { task_id: task_user.task_id, user_id: task_user.user_id },
    //         });
    //       }
    //     }
    //   }
    //   //-------------------------------------

    //   return true;
    // },

    // CreateProject: async (parent, args, context) => {
    //   const {
    //     user_id,
    //     project_name,
    //     project_status_id,
    //     industry_type_id,
    //     company_name,
    //     project_start_date,
    //     project_end_date,
    //     project_manager_id,
    //     project_details,

    //     work_location,
    //     work_documents,
    //     teams,
    //   } = args;

    //   delete args.user_id;
    //   delete args.work_location;
    //   delete args.work_documents;
    //   delete args.teams;

    //   const getUserByUserID = await context.prisma.user.findMany({
    //     where: {
    //       user_id: user_id,
    //     },
    //   });

    //   if (getUserByUserID.length < 1) {
    //     throw new ValidationError("User doesnot exist!");
    //     // return null;
    //   }

    //   const company_id = getUserByUserID[0].company_id;

    //   args.company_id = company_id;

    //   // const getdesignationsByCompanyID = await context.prisma.user.findMany({
    //   //   where: {
    //   //     company_id: company_id,
    //   //   },
    //   // });

    //   console.log(args);

    //   let createProject = await context.prisma.project.create({
    //     data: { ...args },
    //   });

    //   const guid = createProject.guid;

    //   work_location.project_id = guid;
    //   let createProjectAddress = await context.prisma.project_address.create({
    //     data: { ...work_location },
    //   });

    //   let createTeam;
    //   let createTeamUser;
    //   let getTeam;
    //   let team_id_from;

    //   if (teams && teams.length > 0) {
    //     for (let i = 0; i < teams.length; ++i) {
    //       getTeam = await context.prisma.teams.findMany({
    //         where: { team_name: teams.team_name },
    //       });

    //       if (getTeam.length < 1) {
    //         createTeam = await context.prisma.teams.create({
    //           data: { project_id: guid, team_name: teams.team_name },
    //         });

    //         team_id_from = createTeam.guid;
    //       } else {
    //         team_id_from = getTeam[0].guid;
    //       }

    //       createTeamUser = await context.prisma.team_user.create({
    //         data: { team_id: team_id_from, user_id: teams.user_id },
    //       });
    //     }
    //   }

    //   // Uploading Documents

    //   let documentUploadCount = 0;

    //   function _imageAndVideoUploadPromise() {
    //     return new Promise(async (resolve) => {
    //       // ----------Upload Documents ------------------
    //       if (work_documents && work_documents.length > 0) {
    //         for (let i = 0; i < work_documents.length; ++i) {
    //           const { createReadStream, filename, mimetype, encoding } =
    //             await work_documents[i];
    //           const stream = createReadStream();

    //           let arr = filename.split(".");

    //           let name = arr[0];
    //           let ext = arr[1];

    //           let url = path.join(`${name}-${Date.now()}.${ext}`);

    //           const params = {
    //             Bucket: "crunos-internal-bucket", //backend-staging-bucket
    //             Key: url,
    //             Body: stream,
    //             ContentType: mimetype,
    //           };

    //           // Uploading files to the bucket
    //           s3.upload(params, async function (err, data) {
    //             if (err) {
    //               //throw err;
    //               console.log(err);
    //               return "failure (" + filename + ")";
    //             }

    //             let insertDocumentInformationToDatabase =
    //               await context.prisma.project_documents.create({
    //                 data: {
    //                   project_id: guid,
    //                   document_url: data.Location,
    //                   file_name: url,
    //                   extension: ext,
    //                 },
    //               });

    //             documentUploadCount++;
    //             console.log("Document URL: ", data.Location);
    //             if (documentUploadCount === documents.length) {
    //               resolve();
    //             }

    //             //imageUploadURLArray.push({ filename: url, url: data.Location });
    //             // console.log(`File uploaded successfully. ${data.Location}`);
    //           });
    //         }
    //       } else {
    //         console.log("No document");
    //         resolve();
    //       }

    //       //------------documents Upload End---------
    //     });
    //   }

    //   await _imageAndVideoUploadPromise();
    //   // End Uploading Document code
    //   return true;
    // },

    // GetPaymentIntent: async (parent, args, context) => {
    //   // amount: 1099,
    //   // currency: "cad",
    //   // payment_method_types: ["card"],

    //   //   description: "payment intent for cart items",
    //   //   receipt_email: "johns@gmail.com",

    //   let { user_id, receipt_email, amount, description } = args;

    //   if (!description) {
    //     description = "Miscellaneous";
    //   }

    //   let returnObj = await paymentIntent(
    //     user_id,
    //     receipt_email,
    //     parseInt(amount) * 100,
    //     description
    //   );

    //   return returnObj;
    // },

    // JobSalaryInformation: async (parent, args, context) => {
    //   const {
    //     user_id,
    //     company_id,
    //     job_id,
    //     currency,
    //     minimum_salary,
    //     maximum_salary,
    //     supplimental_pays,
    //     other_benefits,
    //   } = args;

    //   delete args.company_id;
    //   delete args.job_id;

    //   let getUser = await context.prisma.user.findUnique({
    //     where: { user_id: user_id },
    //   });

    //   if (!getUser) {
    //     return null;
    //   }

    //   //----------------------------------------------

    //   let getCompany = await context.prisma.company.findUnique({
    //     where: { company_id: company_id },
    //   });

    //   if (!getCompany) {
    //     return null;
    //   }

    //   // -----------------------------------------------

    //   let updateJobPreferences = await context.prisma.job.update({
    //     where: {
    //       job_id: job_id,
    //     },
    //     data: {
    //       currency: currency,
    //       minimum_salary: minimum_salary,
    //       maximum_salary: maximum_salary,
    //       supplimental_pays: supplimental_pays,
    //       other_benefits: other_benefits,
    //     },
    //   });

    //   return { job_id: job_id };
    // },

    // JobGeneralInformation: async (parent, args, context) => {
    //   const {
    //     user_id,
    //     company_id,
    //     job_id,
    //     job_types,
    //     no_of_working_hours,
    //     working_hour_type,
    //     job_schedules,
    //     is_job_start_date,
    //     job_start_date,
    //     will_job_expire,
    //     job_expiry_date,
    //     no_of_candidates,
    //     candidate_relocation_required,
    //     relocation_provided_by_company,
    //     job_contacts,
    //   } = args;

    //   delete args.user_id;
    //   delete args.company_id;
    //   delete args.job_id;
    //   delete args.job_contact;

    //   let getUser = await context.prisma.user.findUnique({
    //     where: { user_id: user_id },
    //   });

    //   if (!getUser) {
    //     return null;
    //   }

    //   //----------------------------------------------

    //   let getCompany = await context.prisma.company.findUnique({
    //     where: { company_id: company_id },
    //   });

    //   if (!getCompany) {
    //     return null;
    //   }

    //   // -----------------------------------------------

    //   let updateJobPreferences = await context.prisma.job.update({
    //     where: {
    //       job_id: job_id,
    //     },
    //     data: {
    //       job_types: job_types,
    //       no_of_working_hours: no_of_working_hours,
    //       working_hour_type: working_hour_type,
    //       job_schedules: job_schedules,
    //       is_job_start_date: is_job_start_date,
    //       job_start_date: job_start_date,
    //       will_job_expire: will_job_expire,
    //       job_expiry_date: job_expiry_date,
    //       no_of_candidates: no_of_candidates,
    //       candidate_relocation_required: candidate_relocation_required,
    //       relocation_provided_by_company: relocation_provided_by_company,
    //     },
    //   });

    //   let createJobContact;
    //   if (job_contacts.length > 0) {
    //     for (let i = 0; i < job_contacts.length; ++i) {
    //       createJobContact = await context.prisma.job_contact.create({
    //         data: {
    //           phone_number: job_contacts.phone_number,
    //           designation: job_contacts.designation,
    //           name: job_contacts.name,
    //           email: job_contacts.email,
    //           job_id: job_id,
    //         },
    //       });
    //     }
    //   }

    //   return { job_id: job_id };
    // },
    // JobPreferences: async (parent, args, context) => {
    //   const {
    //     user_id,
    //     company_id,
    //     job_id,
    //     is_specific_address,
    //     is_remote_work,
    //     address,
    //     recieve_through_email,
    //     recieve_through_walkin,
    //     walkin_start_date,
    //     walkin_end_date,
    //     is_resume_required,
    //   } = args;

    //   delete args.company_id;
    //   delete args.job_id;
    //   delete args.address;

    //   let getUser = await context.prisma.user.findUnique({
    //     where: { user_id: user_id },
    //   });

    //   if (!getUser) {
    //     return null;
    //   }

    //   //----------------------------------------------

    //   let getCompany = await context.prisma.company.findUnique({
    //     where: { company_id: company_id },
    //   });

    //   if (!getCompany) {
    //     return null;
    //   }

    //   // -----------------------------------------------

    //   let updateJobPreferences = await context.prisma.job.update({
    //     where: {
    //       job_id: job_id,
    //     },
    //     data: {
    //       is_specific_address: is_specific_address,
    //       is_remote_work: is_remote_work,
    //       recieve_through_email: recieve_through_email,
    //       recieve_through_walkin: recieve_through_walkin,
    //       walkin_start_date: walkin_start_date,
    //       walkin_end_date: walkin_end_date,
    //       is_resume_required: is_resume_required,
    //     },
    //   });

    //   if (is_specific_address) {
    //     let createJobAddress = await context.prisma.job_address.create({
    //       data: {
    //         country: address.country,
    //         province: address.province,
    //         city: address.city,
    //         postal_zip_code: address.postal_zip_code,
    //         street_no: address.street_no,
    //         job_id: job_id,
    //       },
    //     });
    //   }

    //   return { job_id: job_id };
    // },
    // JobInitiation: async (parent, args, context) => {
    //   let {
    //     user_id,
    //     company_id,
    //     job_title,
    //     experience_required,
    //     education_level_id,
    //     job_description,
    //     skills_or_related_experience,
    //     training_or_certificate,
    //   } = args;

    //   delete args.company_id;

    //   let getUser = await context.prisma.user.findUnique({
    //     where: { user_id: user_id },
    //   });

    //   if (!getUser) {
    //     return null;
    //   }

    //   //----------------------------------------------

    //   let getCompany = await context.prisma.company.findUnique({
    //     where: { company_id: company_id },
    //   });

    //   if (!getCompany) {
    //     return null;
    //   }

    //   // -----------------------------------------------

    //   let createJobInitiation = await context.prisma.job.create({
    //     data: { ...args },
    //   });

    //   console.log(createJobInitiation);

    //   return { job_id: createJobInitiation.job_id };
    // },

    // DeleteCompany: async (parent, args, context) => {
    //   let { user_id, company_id, is_company_approved } = args;

    //   let getUser = await context.prisma.user.findUnique({
    //     where: { user_id: user_id },
    //   });

    //   if (!getUser) {
    //     return null;
    //   }

    //   //----------------------------------------------

    //   let getCompany = await context.prisma.company.findUnique({
    //     where: { company_id: company_id },
    //   });

    //   if (!getCompany) {
    //     return null;
    //   }

    //   // -----------------------------------------------

    //   let updateCompanyDetails = await context.prisma.company.updateMany({
    //     where: {
    //       company_id: company_id,
    //       is_company_approved: is_company_approved,
    //     },
    //     data: {
    //       is_deleted: true,
    //     },
    //   });

    //   if (updateCompanyDetails.length > 0) {
    //     return "Company deleted!";
    //   } else {
    //     return "No record found!";
    //   }
    // },

    // //aaa
    // AddInactiveCompanyDetails: async (parent, args, context) => {
    //   const {
    //     user_id,
    //     company_id,
    //     company_name,
    //     GST_number,
    //     status,
    //     email,
    //     mobile_no,
    //     documents,
    //   } = args;

    //   let getUser = await context.prisma.user.findUnique({
    //     where: { user_id: user_id },
    //   });

    //   if (!getUser) {
    //     return null;
    //   }

    //   //----------------------------------------------

    //   let getCompany = await context.prisma.company.findUnique({
    //     where: { company_id: company_id },
    //   });

    //   if (!getCompany) {
    //     return null;
    //   }

    //   // -----------------------------------------------

    //   // let getCompanyUser = await context.prisma.user.findMany({
    //   //   where: {
    //   //     email: email,
    //   //     company_id: company_id,
    //   //     designation: "SUPER_ADMIN",
    //   //   },
    //   // });

    //   // if (getCompanyUser.length < 1) {
    //   //   return null;
    //   // }

    //   //------------------------------------------------

    //   // console.log(company_id);
    //   // rehan
    //   try {
    //     let updateCompanyDetails = await context.prisma.company.update({
    //       where: {
    //         company_id: company_id,
    //       },
    //       data: {
    //         company_name: company_name,
    //         is_company_approved: status,
    //         GST_number: GST_number,
    //       },
    //     });
    //   } catch (e) {
    //     console.log();
    //     throw new UserInputError("Company name already exists!");
    //   }

    //   console.log("Company Detail Updated!");

    //   // //------------Update Email and Phone No------------------

    //   // let updateCompanyUser = await context.prisma.user.update({
    //   //   where: {
    //   //     user_id: getCompanyUser[0].user_id,
    //   //   },
    //   //   data: { email: email, mobile_no: mobile_no },
    //   // });

    //   // console.log("User Detail Updated!");

    //   // let updateCompanyUserEmail = await context.prisma.user_email.update({
    //   //   where: {
    //   //     user_id: getCompanyUser[0].user_id,
    //   //   },
    //   //   data: { email: email },
    //   // });

    //   // console.log("User Email Updated!");

    //   // let updateCompanyUserPhone = await context.prisma.user_contact.update({
    //   //   where: {
    //   //     user_id: getCompanyUser[0].user_id,
    //   //   },
    //   //   data: { contact_no: mobile_no },
    //   // });

    //   // console.log("User Phone_no Updated!");

    //   // //-------------------------------------------------------

    //   //------------------Documents Upload ----------------------

    //   //     document: Upload!
    //   // description: String!

    //   let ExtensionList = [
    //     "jpg",
    //     "png",
    //     "gif",
    //     "tif",
    //     "webp",
    //     "bmp",
    //     "svg",
    //   ];
    //   let _is_image;
    //   let return_object = [];

    //   function _imageAndVideoUploadPromise() {
    //     return new Promise(async (resolve) => {
    //       // ----------Upload Documents ------------------
    //       if (documents && documents.length > 0) {
    //         for (let i = 0; i < documents.length; ++i) {
    //           const { createReadStream, filename, mimetype, encoding } =
    //             await documents[i].document;
    //           const stream = createReadStream();

    //           let arr = filename.split(".");

    //           let name = arr[0];
    //           let ext = arr[1];

    //           let url = path.join(`${name}-${Date.now()}.${ext}`);

    //           const params = {
    //             Bucket: "crunos-internal-bucket", //backend-staging-bucket
    //             Key: url,
    //             Body: stream,
    //             ContentType: mimetype,
    //           };

    //           if (ExtensionList.includes(ext.toLowerCase())) {
    //             _is_image = true;
    //           } else {
    //             _is_image = false;
    //           }

    //           // Uploading files to the bucket
    //           s3.upload(params, async function (err, data) {
    //             if (err) {
    //               //throw err;
    //               console.log(err);
    //               return "failure (" + filename + ")";
    //             }

    //             let insertDocumentInformationToDatabase =
    //               await context.prisma.company_document.create({
    //                 data: {
    //                   company_id: company_id,
    //                   document_url: data.Location,
    //                   filename: url,
    //                   extension: ext,
    //                   description: documents[i].description,
    //                   status: documents[i].status,
    //                 },
    //               });

    //             return_object.push({
    //               company_document_id:
    //                 insertDocumentInformationToDatabase.company_document_id,
    //               url: data.Location,
    //               is_image: _is_image,
    //               filename: url,
    //               description: documents[i].description,
    //               status: documents[i].status,
    //             });

    //             documentUploadCount++;
    //             console.log("Document URL: ", data.Location);
    //             if (documentUploadCount === documents.length) {
    //               resolve();
    //             }

    //             //imageUploadURLArray.push({ filename: url, url: data.Location });
    //             // console.log(`File uploaded successfully. ${data.Location}`);
    //           });
    //         }
    //       } else {
    //         console.log("No document");
    //         resolve();
    //       }

    //       //------------documents Upload End---------
    //     });
    //   }

    //   await _imageAndVideoUploadPromise();

    //   //-------------------Documents Upload End------------------

    //   //-------------------Documents Upload End------------------
    //   // console.log(return_object);
    //   return return_object;
    // },

    // DeleteCompanyEmployee: async (parent, args, context) => {
    //   let { user_id, company_employee_user_id, company_id, is_active } = args;

    //   let deleteCompanyUser = await context.prisma.user.deleteMany({
    //     where: {
    //       user_id: company_employee_user_id,
    //       company_id: company_id,
    //       is_active: is_active,
    //       is_employer: true,
    //     },
    //   });

    //   console.log("--------Delete Company User--------");
    //   console.log(deleteCompanyUser);

    //   return deleteCompanyUser.count + " Company Employee Deleted!";
    // },
    // addNewDepartmentForCompany: async (parent, args, context) => {
    //   let { user_id, company_id, title } = args;
    //   let returnString = "failed";

    //   let getUser = await context.prisma.user.findUnique({
    //     where: { user_id: user_id },
    //   });

    //   if (!getUser) {
    //     return null;
    //   }

    //   let getCompany = await context.prisma.company.findUnique({
    //     where: { company_id: company_id },
    //   });

    //   if (!getCompany) {
    //     return null;
    //   }

    //   let getDepartment = await context.prisma.department.findMany({
    //     where: { company_id: company_id },
    //   });

    //   if (getDepartment.length > 0) {
    //     console.log("Company exist in department table");
    //     returnString = "Company exist in department table";

    //     let storedDepartment = getDepartment[0].listing.split(",");

    //     storedDepartment.push(title);

    //     storedDepartment = storedDepartment.toString();

    //     let updateCompanyDepartment = await context.prisma.department.update({
    //       where: {
    //         department_id: getDepartment[0].department_id,
    //       },
    //       data: { listing: storedDepartment },
    //     });
    //   } else {
    //     console.log("Company does not exist in department table");
    //     returnString = "Company does not exist in department table";

    //     let createCompanyDepartment = await context.prisma.department.create({
    //       data: {
    //         company_id: company_id,
    //         listing: title,
    //         title: "null",
    //       },
    //     });
    //   }

    //   return returnString;
    // },
    // addNewDesignationForCompany: async (parent, args, context) => {
    //   let { user_id, company_id, title } = args;
    //   let returnString = "failed";

    //   let getUser = await context.prisma.user.findUnique({
    //     where: { user_id: user_id },
    //   });

    //   if (!getUser) {
    //     return null;
    //   }

    //   let getCompany = await context.prisma.company.findUnique({
    //     where: { company_id: company_id },
    //   });

    //   if (!getCompany) {
    //     return null;
    //   }

    //   let getDesignation = await context.prisma.designation.findMany({
    //     where: { company_id: company_id },
    //   });

    //   if (getDesignation.length > 0) {
    //     console.log("Company exist in designation table");
    //     returnString = "Company exist in designation table";

    //     let storedDesignation = getDesignation[0].listing.split(",");

    //     storedDesignation.push(title);

    //     storedDesignation = storedDesignation.toString();

    //     let updateCompanyDesignation = await context.prisma.designation.update({
    //       where: {
    //         designation_id: getDesignation[0].designation_id,
    //       },
    //       data: { listing: storedDesignation },
    //     });
    //   } else {
    //     console.log("Company does not exist in designation table");
    //     returnString = "Company does not exist in designation table";

    //     let createCompanyDesignation = await context.prisma.designation.create({
    //       data: {
    //         company_id: company_id,
    //         listing: title,
    //         title: "null",
    //       },
    //     });
    //   }

    //   return returnString;
    // },

    // AddCompanyEmployee: async (parent, args, context) => {
    //   let returnStatus = null;
    //   const {
    //     user_id,
    //     company_employee_user_id,
    //     company_id,
    //     name,
    //     profile_picture,
    //     designation,
    //     department,
    //     reports_to,
    //     date_of_joining,
    //     role,
    //     email,
    //     salary,
    //     salary_type,
    //     working_days,
    //     is_active,
    //     send_activation_email,
    //     CompanyEmployee_Emails,
    //     CompanyEmployee_ContactNos,
    //     channels,
    //     CompanyEmployee_EmergencyContact,
    //     CompanyEmployee_Address,
    //     CompanyEmployee_Documents,
    //   } = args;

    //   let return_object = [];

    //   let getUser = await context.prisma.user.findUnique({
    //     where: { user_id: user_id },
    //   });

    //   if (!getUser) {
    //     return null;
    //   }

    //   let getUserEmail = await context.prisma.user.findMany({
    //     where: { email: email },
    //   });

    //   if (
    //     (company_employee_user_id === "" ||
    //       company_employee_user_id === null) &&
    //     getUserEmail.length > 0
    //   ) {
    //     return_object.push({
    //       user_document_id: null,
    //       url: null,
    //       is_image: null,
    //       filename: null,
    //       description: "Email already exist",
    //     });

    //     return return_object;
    //   }

    //   if (company_employee_user_id) {
    //     let getExistedUser = await context.prisma.user.findUnique({
    //       where: { user_id: company_employee_user_id },
    //     });

    //     if (!getExistedUser) {
    //       return_object.push({
    //         user_document_id: null,
    //         url: null,
    //         is_image: null,
    //         filename: null,
    //         description: "User that you want to update is not existed",
    //       });

    //       return return_object;

    //       // return "User that you want to update is not existed";
    //     }
    //   }

    //   let getCompany = await context.prisma.company.findUnique({
    //     where: { company_id: company_id },
    //   });

    //   if (!getCompany) {
    //     return_object.push({
    //       user_document_id: null,
    //       url: null,
    //       is_image: null,
    //       filename: null,
    //       description: "Company doesnot exists",
    //     });

    //     return return_object;

    //     // return null;
    //   }

    //   //----------------------------------------------------------------------------------
    //   let dataLocation = "";

    //   console.log("Before profile picture");

    //   if (profile_picture) {
    //     //-------------- upload profile picture------------------

    //     const { createReadStream, filename, mimetype, encoding } =
    //       await profile_picture;

    //     const stream = createReadStream();

    //     let arr = filename.split(".");

    //     let name = arr[0];
    //     let ext = arr[1];

    //     let url = path.join(`${name}-${Date.now()}.${ext}`);

    //     function imageAndVideoUploadPromise() {
    //       return new Promise(async (resolve) => {
    //         const params = {
    //           Bucket: "crunos-internal-bucket", //backend-staging-bucket
    //           Key: url,
    //           Body: stream,
    //           ContentType: mimetype,
    //         };

    //         // Uploading files to the bucket
    //         s3.upload(params, function (err, data) {
    //           if (err) {
    //             //throw err;
    //             console.log(err);
    //             return "failure";
    //           }
    //           console.log(
    //             `Profile Picture uploaded successfully. ${data.Location}`
    //           );
    //           dataLocation = data.Location;
    //           resolve();
    //         });
    //       });
    //     }

    //     await imageAndVideoUploadPromise();
    //     //-------------- End Profile picture
    //   }

    //   console.log("After profile picture");

    //   //----------------------------------------------------------------------------------

    //   let newCompanyEmployee = {};

    //   newCompanyEmployee.company_id = company_id;
    //   newCompanyEmployee.first_name = name;
    //   newCompanyEmployee.designation = designation;
    //   newCompanyEmployee.department = department;
    //   newCompanyEmployee.reports_to = reports_to;

    //   newCompanyEmployee.role = role;

    //   newCompanyEmployee.email = email;

    //   newCompanyEmployee.is_employer = true;

    //   // contact_type: String!
    //   // contact_extension: String!
    //   // contact_no: String!
    //   // is_primary: Boolean!

    //   console.log("Before loop contact nos");

    //   for (let i = 0; i < CompanyEmployee_ContactNos.length; ++i) {
    //     if (CompanyEmployee_ContactNos[i].is_primary === true) {
    //       newCompanyEmployee.mobile_no =
    //         CompanyEmployee_ContactNos[i].contact_no;
    //       break;
    //     }
    //   }

    //   if (dataLocation != "") {
    //     newCompanyEmployee.profile_picture = dataLocation;
    //   }

    //   if (date_of_joining) {
    //     newCompanyEmployee.date_of_joining = date_of_joining;
    //   } else {
    //     newCompanyEmployee.date_of_joining = null;
    //   }

    //   console.log(
    //     "After date of joining condition and value: ",
    //     newCompanyEmployee.date_of_joining
    //   );

    //   if (working_days) {
    //     newCompanyEmployee.working_days = working_days;
    //   } else {
    //     newCompanyEmployee.working_days = "";
    //   }

    //   if (is_active) {
    //     newCompanyEmployee.is_active = is_active;
    //   } else {
    //     newCompanyEmployee.is_active = false;
    //   }

    //   if (send_activation_email) {
    //     newCompanyEmployee.send_activation_email = send_activation_email;
    //   } else {
    //     newCompanyEmployee.send_activation_email = false;
    //   }

    //   if (salary && salary_type) {
    //     newCompanyEmployee.salary = salary;
    //     newCompanyEmployee.salary_type = salary_type;
    //   } else {
    //     newCompanyEmployee.salary = 0;
    //     newCompanyEmployee.salary_type = "";
    //   }

    //   console.log(company_employee_user_id);

    //   console.log("Before compnay employee user id if condition");
    //   if (company_employee_user_id) {
    //     console.log("compnay employee user id condition true");
    //     console.log(company_employee_user_id);
    //     returnStatus = "updated";
    //     console.log("company_employee_user_id: ", "True");
    //     getUser = await context.prisma.user.findUnique({
    //       where: { user_id: company_employee_user_id },
    //     });

    //     console.log("----------Before user updation-------------------");

    //     if (getUser) {
    //       console.log("----------Get user condition true-------------------");

    //       console.log(newCompanyEmployee);
    //       getUser = await context.prisma.user.update({
    //         where: {
    //           user_id: company_employee_user_id,
    //         },
    //         data: { ...newCompanyEmployee },
    //       });

    //       console.log("Company employee updated successfully!");
    //     } else {
    //       // return "Company employee user id not found!";

    //       return [];
    //     }
    //   } else {
    //     console.log("inside else");
    //     console.log(newCompanyEmployee);
    //     getUser = await context.prisma.user.create({
    //       data: { ...newCompanyEmployee },
    //     });

    //     returnStatus = "created";
    //     console.log("New company employee created successfully!");
    //   }

    //   let created_or_update_company_employee_id = getUser.user_id;

    //   console.log(
    //     "created_or_update_company_employee_id: ",
    //     created_or_update_company_employee_id
    //   );

    //   let updatedData;
    //   let updateEmployeeDetails;
    //   //-------------- Update Address --------------------------

    //   console.log("Before inserting and deleting address");

    //   let deleteExistingAddresses =
    //     await context.prisma.user_address.deleteMany({
    //       where: { user_id: created_or_update_company_employee_id },
    //     });

    //   if (CompanyEmployee_Address && CompanyEmployee_Address.length > 0) {
    //     for (let i = 0; i < CompanyEmployee_Address.length; ++i) {
    //       updatedData = {};
    //       updatedData.street_no = CompanyEmployee_Address[i].street_no;
    //       updatedData.country = CompanyEmployee_Address[i].country;
    //       updatedData.province = CompanyEmployee_Address[i].province;
    //       updatedData.city = CompanyEmployee_Address[i].city;
    //       updatedData.postal_zip_code =
    //         CompanyEmployee_Address[i].postal_zip_code;
    //       updatedData.user_id = created_or_update_company_employee_id;

    //       if (CompanyEmployee_Address[i].street_no) {
    //         updatedData.street_no = CompanyEmployee_Address[i].street_no;
    //       }

    //       updatedData.user_id = created_or_update_company_employee_id;

    //       // console.log(updatedData);

    //       updateEmployeeDetails = await context.prisma.user_address.create({
    //         data: updatedData,
    //       });
    //     }
    //   }

    //   console.log("Addresses saved!");

    //   //-------------- Update Email --------------------------

    //   // input CompanyEmployeeEmails {
    //   //   email_department: String!
    //   //   email: String!
    //   //   is_primary: Boolean!
    //   // }

    //   let deleteExistingEmails = await context.prisma.user_email.deleteMany({
    //     where: {
    //       user_id: created_or_update_company_employee_id,
    //       //is_primary: false,
    //     },
    //   });

    //   if (CompanyEmployee_Emails && CompanyEmployee_Emails.length > 0) {
    //     for (let i = 0; i < CompanyEmployee_Emails.length; ++i) {
    //       //company_id;

    //       updatedData = {};
    //       updatedData.email_department =
    //         CompanyEmployee_Emails[i].email_department;

    //       updatedData.email = CompanyEmployee_Emails[i].email;

    //       // updatedData.is_primary = CompanyEmployee_Emails[i].is_primary;

    //       updatedData.user_id = created_or_update_company_employee_id;

    //       updateEmployeeDetails = await context.prisma.user_email.create({
    //         data: updatedData,
    //       });
    //     }
    //   }

    //   updateEmployeeDetails = await context.prisma.user_email.create({
    //     data: {
    //       user_id: created_or_update_company_employee_id,
    //       email: email,
    //       is_primary: true,
    //     },
    //   });

    //   console.log("Email saved!");

    //   //-------------- Update Contact Nos --------------------------

    //   // contact_type: String!
    //   // contact_extension: String!
    //   // contact_no: String!
    //   // is_primary: Boolean!

    //   let deleteExistingContactNos =
    //     await context.prisma.user_contact.deleteMany({
    //       where: {
    //         user_id: created_or_update_company_employee_id,
    //         is_primary: false,
    //       },
    //     });

    //   if (CompanyEmployee_ContactNos && CompanyEmployee_ContactNos.length > 0) {
    //     for (let i = 0; i < CompanyEmployee_ContactNos.length; ++i) {
    //       //company_id;

    //       updatedData = {};
    //       updatedData.contact_type = CompanyEmployee_ContactNos[i].contact_type;

    //       updatedData.contact_extension =
    //         CompanyEmployee_ContactNos[i].contact_extension;

    //       updatedData.contact_no = CompanyEmployee_ContactNos[i].contact_no;

    //       updatedData.is_primary = CompanyEmployee_ContactNos[i].is_primary;

    //       updatedData.user_id = created_or_update_company_employee_id;

    //       updateEmployeeDetails = await context.prisma.user_contact.create({
    //         data: updatedData,
    //       });
    //     }
    //   }

    //   console.log("Contact Nos saved!");

    //   //-------------- Update company_channel --------------------------

    //   let deleteExistingCompanyChannels =
    //     await context.prisma.user_channel.deleteMany({
    //       where: { user_id: created_or_update_company_employee_id },
    //     });

    //   if (channels && channels.length > 0) {
    //     for (let i = 0; i < channels.length; ++i) {
    //       //company_id;

    //       if (
    //         channels[i].channel_id === null ||
    //         channels[i].channel_id === "" ||
    //         channels[i].url === null ||
    //         channels[i].url === ""
    //       ) {
    //         continue;
    //       }

    //       updateEmployeeDetails = await context.prisma.user_channel.create({
    //         data: {
    //           channel_id: channels[i].channel_id,
    //           url: channels[i].url,
    //           user_id: created_or_update_company_employee_id,
    //         },
    //       });
    //     }
    //   }

    //   //-------------- Update Company emergency details --------------------------

    //   // name: String!
    //   // relationship: String!
    //   // mobile: String!
    //   // email: String

    //   let deleteExistingCompanyEmergencyDetails =
    //     await context.prisma.user_emergency_contact.deleteMany({
    //       where: { user_id: created_or_update_company_employee_id },
    //     });

    //   let optionalEmail = "";

    //   if (
    //     CompanyEmployee_EmergencyContact &&
    //     CompanyEmployee_EmergencyContact.length > 0
    //   ) {
    //     for (let i = 0; i < CompanyEmployee_EmergencyContact.length; ++i) {
    //       if (
    //         CompanyEmployee_EmergencyContact[i].name !== null ||
    //         CompanyEmployee_EmergencyContact[i].name !== "" ||
    //         CompanyEmployee_EmergencyContact[i].mobile !== null ||
    //         CompanyEmployee_EmergencyContact[i].mobile !== ""
    //       ) {
    //         optionalEmail = "";

    //         if (CompanyEmployee_EmergencyContact[i].email) {
    //           optionalEmail = CompanyEmployee_EmergencyContact[i].email;
    //         }

    //         updateEmployeeDetails =
    //           await context.prisma.user_emergency_contact.create({
    //             data: {
    //               name: CompanyEmployee_EmergencyContact[i].name,
    //               mobile: CompanyEmployee_EmergencyContact[i].mobile,
    //               relationship:
    //                 CompanyEmployee_EmergencyContact[i].relationship,
    //               email: optionalEmail,
    //               user_id: created_or_update_company_employee_id,
    //             },
    //           });
    //       }
    //     }
    //   }

    //   console.log("Emergency Contact Nos saved!");
    //   //-------------- End Company emergency details-----------

    //   //------------------Documents Upload ----------------------

    //   let ExtensionList = [
    //     "jpg",
    //     "png",
    //     "gif",
    //     "tif",
    //     "webp",
    //     "bmp",
    //     "svg",
    //   ];
    //   let _is_image;

    //   //     document: Upload!
    //   // description: String!

    //   let documentUploadCount = 0;

    //   function _imageAndVideoUploadPromise() {
    //     return new Promise(async (resolve) => {
    //       // ----------Upload Documents ------------------
    //       if (
    //         CompanyEmployee_Documents &&
    //         CompanyEmployee_Documents.length > 0
    //       ) {
    //         for (let i = 0; i < CompanyEmployee_Documents.length; ++i) {
    //           const { createReadStream, filename, mimetype, encoding } =
    //             await CompanyEmployee_Documents[i].document;
    //           const stream = createReadStream();

    //           let arr = filename.split(".");

    //           let name = arr[0];
    //           let ext = arr[1];

    //           let url = path.join(`${name}-${Date.now()}.${ext}`);

    //           if (ExtensionList.includes(ext.toLowerCase())) {
    //             _is_image = true;
    //           } else {
    //             _is_image = false;
    //           }

    //           const params = {
    //             Bucket: "crunos-internal-bucket", //backend-staging-bucket
    //             Key: url,
    //             Body: stream,
    //             ContentType: mimetype,
    //           };

    //           // Uploading files to the bucket
    //           s3.upload(params, async function (err, data) {
    //             if (err) {
    //               //throw err;
    //               console.log(err);
    //               return "failure (" + filename + ")";
    //             }

    //             let insertDocumentInformationToDatabase =
    //               await context.prisma.user_document.create({
    //                 data: {
    //                   user_id: created_or_update_company_employee_id,
    //                   document_url: data.Location,
    //                   filename: url,
    //                   extension: ext,
    //                   description: CompanyEmployee_Documents[i].description,
    //                 },
    //               });

    //             return_object.push({
    //               user_document_id:
    //                 insertDocumentInformationToDatabase.user_document_id,
    //               url: data.Location,
    //               is_image: _is_image,
    //               filename: url,
    //               description: CompanyEmployee_Documents[i].description,
    //             });

    //             documentUploadCount++;
    //             console.log("Document URL: ", data.Location);
    //             if (documentUploadCount === CompanyEmployee_Documents.length) {
    //               resolve();
    //             }

    //             //imageUploadURLArray.push({ filename: url, url: data.Location });
    //             // console.log(`File uploaded successfully. ${data.Location}`);
    //           });
    //         }
    //       } else {
    //         console.log("No document");
    //         return_object.push({
    //           user_document_id: null,
    //           url: null,
    //           is_image: null,
    //           filename: null,
    //           description: "No document",
    //         });
    //         resolve();
    //       }

    //       //------------documents Upload End---------
    //     });
    //   }

    //   await _imageAndVideoUploadPromise();

    //   //-------------------Documents Upload End------------------

    //   console.log("Document Uploaded!");

    //   // console.log(returnStatus);

    //   // return return_object;

    //   console.log("-------------------------------");
    //   // mmmmm
    //   console.log(return_object);

    //   return return_object;
    // },
    // selectSubscriptionPlanForCompany: async (parent, args, context) => {
    //   const { user_id, company_id, subscription_id } = args;

    //   let getCompany = await context.prisma.company.findUnique({
    //     where: { company_id: company_id },
    //   });

    //   if (!getCompany) {
    //     return null;
    //   }

    //   let updateCompanyDetails = await context.prisma.company.update({
    //     where: {
    //       company_id: company_id,
    //     },
    //     data: { subscription_id: subscription_id },
    //   });

    //   return updateCompanyDetails;
    // },

    // toActiveCompany: async (parent, args, context) => {
    //   const { user_id, company_id, status } = args;

    //   let getCompany = await context.prisma.company.findUnique({
    //     where: { company_id: company_id },
    //   });

    //   if (!getCompany) {
    //     return null;
    //   }

    //   let updateCompanyDetails = await context.prisma.company.update({
    //     where: {
    //       company_id: company_id,
    //     },
    //     data: { is_company_approved: status },
    //   });

    //   return updateCompanyDetails;
    // },
    // AddNewSkill: async (parent, args, context) => {
    //   let { user_id, skill_name } = args;

    //   let getSkill = await context.prisma.skill.findMany({
    //     where: { skill_name: skill_name },
    //   });

    //   if (getSkill.length > 0) {
    //     return getSkill[0];
    //   }

    //   let addNewSkill = await context.prisma.skill.create({
    //     data: { skill_name: skill_name },
    //   });

    //   return addNewSkill;
    // },

    // CompanyPortfolio: async (parent, args, context) => {
    //   const { user_id, company_id, images, videos } = args;

    //   let return_object = [];

    //   let getCompany = await context.prisma.company.findUnique({
    //     where: { company_id: company_id },
    //   });

    //   if (!getCompany) {
    //     return null;
    //   }

    //   let imageUploadCount = 0;
    //   let videoUploadCount = 0;

    //   // let imageUploadURLArray = [];
    //   // let videoUploadURLArray = [];

    //   function imageAndVideoUploadPromise() {
    //     return new Promise(async (resolve) => {
    //       if (videos.length <= 0 && images.length <= 0) {
    //         resolve();
    //       }
    //       // ----------Upload Images ------------------
    //       if (images.length > 0) {
    //         for (let i = 0; i < images.length; ++i) {
    //           const { createReadStream, filename, mimetype, encoding } =
    //             await images[i];
    //           const stream = createReadStream();

    //           let arr = filename.split(".");

    //           let name = arr[0];
    //           let ext = arr[1];

    //           let url = path.join(`${name}-${Date.now()}.${ext}`);

    //           const params = {
    //             Bucket: "crunos-internal-bucket", //backend-staging-bucket
    //             Key: url,
    //             Body: stream,
    //             ContentType: mimetype,
    //           };

    //           // Uploading files to the bucket
    //           s3.upload(params, async function (err, data) {
    //             if (err) {
    //               //throw err;
    //               console.log(err);
    //               return "failure (" + filename + ")";
    //             }

    //             let insertImageInformationToDatabase =
    //               await context.prisma.company_portfolio.create({
    //                 data: {
    //                   company_id: company_id,
    //                   url: data.Location,
    //                   is_image: true,
    //                   filename: url,
    //                 },
    //               });

    //             return_object.push({
    //               guid: insertImageInformationToDatabase.guid,
    //               url: data.Location,
    //               is_image: true,
    //             });
    //             imageUploadCount++;
    //             console.log("Image URL: ", data.Location);
    //             if (
    //               imageUploadCount === images.length &&
    //               videoUploadCount === videos.length
    //             ) {
    //               resolve();
    //             }

    //             //imageUploadURLArray.push({ filename: url, url: data.Location });
    //             // console.log(`File uploaded successfully. ${data.Location}`);
    //           });
    //         }
    //       } else {
    //         console.log("No image");
    //       }

    //       //------------Image Upload End---------

    //       //-----------Video Upload----------

    //       if (videos.length > 0) {
    //         for (let i = 0; i < videos.length; ++i) {
    //           const { createReadStream, filename, mimetype, encoding } =
    //             await videos[i];
    //           const stream = createReadStream();

    //           let arr = filename.split(".");

    //           let name = arr[0];
    //           let ext = arr[1];

    //           let url = path.join(`${name}-${Date.now()}.${ext}`);

    //           const params = {
    //             Bucket: "crunos-internal-bucket", //backend-staging-bucket
    //             Key: url,
    //             Body: stream,
    //             ContentType: mimetype,
    //           };

    //           // Uploading files to the bucket
    //           s3.upload(params, async function (err, data) {
    //             if (err) {
    //               //throw err;
    //               console.log(err);
    //               return "failure (" + filename + ")";
    //             }

    //             let insertVideoInformationToDatabase =
    //               await context.prisma.company_portfolio.create({
    //                 data: {
    //                   company_id: company_id,
    //                   url: data.Location,
    //                   is_image: false,
    //                   filename: url,
    //                 },
    //               });

    //             videoUploadCount++;
    //             return_object.push({
    //               guid: insertVideoInformationToDatabase.guid,
    //               url: data.Location,
    //               is_image: false,
    //             });
    //             console.log("Video URL: ", data.Location);
    //             if (
    //               imageUploadCount === images.length &&
    //               videoUploadCount === videos.length
    //             ) {
    //               resolve();
    //             }
    //             // videoUploadURLArray.push({ filename: url, url: data.Location });
    //             // console.log(`File uploaded successfully. ${data.Location}`);
    //           });
    //         }
    //       } else {
    //         console.log("No video");
    //       }

    //       // -----------Video Upload End----------
    //     });
    //   }

    //   await imageAndVideoUploadPromise();

    //   // console.log("--------------");
    //   // console.log(return_object);

    //   //return `${imageUploadCount} Image(s) and ${videoUploadCount} Video(s) are uploaded!`;

    //   // console.log(return_object);
    //   return return_object;
    // },

    // EmployeePortfolio: async (parent, args, context) => {
    //   const { user_id, company_id, images, videos } = args;

    //   let return_object = [];

    //   let getUser = await context.prisma.user.findUnique({
    //     where: { user_id: user_id },
    //   });

    //   if (!getUser) {
    //     return null;
    //   }

    //   let imageUploadCount = 0;
    //   let videoUploadCount = 0;

    //   // let imageUploadURLArray = [];
    //   // let videoUploadURLArray = [];

    //   function imageAndVideoUploadPromise() {
    //     return new Promise(async (resolve) => {
    //       if (videos.length <= 0 && images.length <= 0) {
    //         resolve();
    //       }
    //       // ----------Upload Images ------------------
    //       if (images.length > 0) {
    //         for (let i = 0; i < images.length; ++i) {
    //           const { createReadStream, filename, mimetype, encoding } =
    //             await images[i];
    //           const stream = createReadStream();

    //           let arr = filename.split(".");

    //           let name = arr[0];
    //           let ext = arr[1];

    //           let url = path.join(`${name}-${Date.now()}.${ext}`);

    //           const params = {
    //             Bucket: "crunos-internal-bucket", //backend-staging-bucket
    //             Key: url,
    //             Body: stream,
    //             ContentType: mimetype,
    //           };

    //           // Uploading files to the bucket
    //           s3.upload(params, async function (err, data) {
    //             if (err) {
    //               //throw err;
    //               console.log(err);
    //               return "failure (" + filename + ")";
    //             }

    //             let insertImageInformationToDatabase =
    //               await context.prisma.user_portfolio.create({
    //                 data: {
    //                   user_id: user_id,
    //                   url: data.Location,
    //                   is_image: true,
    //                   filename: url,
    //                 },
    //               });

    //             return_object.push({
    //               guid: insertImageInformationToDatabase.guid,
    //               url: data.Location,
    //               is_image: true,
    //             });
    //             imageUploadCount++;
    //             console.log("Image URL: ", data.Location);
    //             if (
    //               imageUploadCount === images.length &&
    //               videoUploadCount === videos.length
    //             ) {
    //               resolve();
    //             }

    //             //imageUploadURLArray.push({ filename: url, url: data.Location });
    //             // console.log(`File uploaded successfully. ${data.Location}`);
    //           });
    //         }
    //       } else {
    //         console.log("No image");
    //       }

    //       //------------Image Upload End---------

    //       //-----------Video Upload----------

    //       if (videos.length > 0) {
    //         for (let i = 0; i < videos.length; ++i) {
    //           const { createReadStream, filename, mimetype, encoding } =
    //             await videos[i];
    //           const stream = createReadStream();

    //           let arr = filename.split(".");

    //           let name = arr[0];
    //           let ext = arr[1];

    //           let url = path.join(`${name}-${Date.now()}.${ext}`);

    //           const params = {
    //             Bucket: "crunos-internal-bucket", //backend-staging-bucket
    //             Key: url,
    //             Body: stream,
    //             ContentType: mimetype,
    //           };

    //           // Uploading files to the bucket
    //           s3.upload(params, async function (err, data) {
    //             if (err) {
    //               //throw err;
    //               console.log(err);
    //               return "failure (" + filename + ")";
    //             }

    //             let insertVideoInformationToDatabase =
    //               await context.prisma.user_portfolio.create({
    //                 data: {
    //                   user_id: user_id,
    //                   url: data.Location,
    //                   is_image: false,
    //                   filename: url,
    //                 },
    //               });

    //             videoUploadCount++;
    //             return_object.push({
    //               guid: insertVideoInformationToDatabase.guid,
    //               url: data.Location,
    //               is_image: false,
    //             });
    //             console.log("Video URL: ", data.Location);
    //             if (
    //               imageUploadCount === images.length &&
    //               videoUploadCount === videos.length
    //             ) {
    //               resolve();
    //             }
    //             // videoUploadURLArray.push({ filename: url, url: data.Location });
    //             // console.log(`File uploaded successfully. ${data.Location}`);
    //           });
    //         }
    //       } else {
    //         console.log("No video");
    //       }

    //       // -----------Video Upload End----------
    //     });
    //   }

    //   await imageAndVideoUploadPromise();

    //   // console.log("--------------");
    //   // console.log(return_object);

    //   //return `${imageUploadCount} Image(s) and ${videoUploadCount} Video(s) are uploaded!`;

    //   // console.log(return_object);
    //   return return_object;
    // },
    // CompanyBasicDetails: async (parent, args, context) => {
    //   const { user_id, company_id, about_us, industry_type_id, documents } =
    //     args;

    //   let getCompany = await context.prisma.company.findUnique({
    //     where: { company_id: company_id },
    //   });

    //   if (!getCompany) {
    //     return null;
    //   }

    //   let updateCompanyBasicDetails = await context.prisma.company.update({
    //     where: {
    //       company_id: company_id,
    //     },
    //     data: {
    //       about_us: about_us,
    //       industry_type_id: industry_type_id,
    //     },
    //   });

    //   //------------------Documents Upload ----------------------

    //   function imageAndVideoUploadPromise() {
    //     return new Promise(async (resolve) => {
    //       // ----------Upload Documents ------------------
    //       if (documents.length > 0) {
    //         for (let i = 0; i < documents.length; ++i) {
    //           const { createReadStream, filename, mimetype, encoding } =
    //             await documents[i];
    //           const stream = createReadStream();

    //           let arr = filename.split(".");

    //           let name = arr[0];
    //           let ext = arr[1];

    //           let url = path.join(`${name}-${Date.now()}.${ext}`);

    //           const params = {
    //             Bucket: "crunos-internal-bucket", //backend-staging-bucket
    //             Key: url,
    //             Body: stream,
    //             ContentType: mimetype,
    //           };

    //           // Uploading files to the bucket
    //           s3.upload(params, async function (err, data) {
    //             if (err) {
    //               //throw err;
    //               console.log(err);
    //               return "failure (" + filename + ")";
    //             }

    //             let insertDocumentInformationToDatabase =
    //               await context.prisma.company_document.create({
    //                 data: {
    //                   company_id: company_id,
    //                   document_url: data.Location,
    //                   filename: url,
    //                   extension: ext,
    //                 },
    //               });

    //             documentUploadCount++;
    //             console.log("Document URL: ", data.Location);
    //             if (documentUploadCount === documents.length) {
    //               resolve();
    //             }

    //             //imageUploadURLArray.push({ filename: url, url: data.Location });
    //             // console.log(`File uploaded successfully. ${data.Location}`);
    //           });
    //         }
    //       } else {
    //         console.log("No document");
    //         resolve();
    //       }

    //       //------------Image Upload End---------
    //     });
    //   }

    //   await imageAndVideoUploadPromise();

    //   //-------------------Documents Upload End------------------

    //   return `success: ${documentUploadCount} document(s) are uploaded!`;
    // },
    // multipleFileUploadTest: async (parent, args, context) => {
    //   const { file } = args;

    //   const { createReadStream, filename, mimetype, encoding } = await file[0];

    //   const stream = createReadStream();

    //   const params = {
    //     Bucket: "crunos-internal-bucket", //backend-staging-bucket
    //     Key: "filename3.jpg",
    //     Body: stream,
    //     ContentType: mimetype,
    //   };

    //   // Uploading files to the bucket
    //   s3.upload(params, function (err, data) {
    //     if (err) {
    //       //throw err;
    //       console.log(err);
    //       return false;
    //     }
    //     console.log(`File uploaded successfully. ${data.Location}`);
    //     return true;
    //   });
    // },
    // singleFileUploadTest: async (parent, args, context) => {
    //   const { user_id, file } = args;

    //   const { createReadStream, filename, mimetype, encoding } = await file;

    //   const stream = createReadStream();

    //   let dataLocation = "";

    //   function imageAndVideoUploadPromise() {
    //     return new Promise(async (resolve) => {
    //       const params = {
    //         Bucket: "crunos-internal-bucket", //backend-staging-bucket
    //         Key: "filename3.jpg",
    //         Body: stream,
    //         ContentType: mimetype,
    //       };

    //       // Uploading files to the bucket
    //       s3.upload(params, function (err, data) {
    //         if (err) {
    //           //throw err;
    //           console.log(err);
    //           return "failure";
    //         }
    //         console.log(`File uploaded successfully. ${data.Location}`);
    //         dataLocation = data.Location;
    //         resolve();
    //       });
    //     });
    //   }

    //   await imageAndVideoUploadPromise();
    //   return `url: ${dataLocation}        filename: ${filename}            userid: ${user_id}`;
    // },
    // deleteCompanyDocument: async (parent, args, context) => {
    //   let { user_id, company_id, company_document_id } = args;

    //   let getCompany = await context.prisma.company.findUnique({
    //     where: { company_id: company_id },
    //   });

    //   if (!getCompany) {
    //     return null;
    //   }

    //   const deleteCompanyDocument =
    //     await context.prisma.company_document.deleteMany({
    //       where: {
    //         company_id: company_id,
    //         company_document_id: company_document_id,
    //       },
    //     });

    //   return `${deleteCompanyDocument.count} document deleted!`;
    // },
    // //mark3
    // deleteEmployeeDocument: async (parent, args, context) => {
    //   let { user_id, user_document_id } = args;

    //   let getUser = await context.prisma.user.findUnique({
    //     where: { user_id: user_id },
    //   });

    //   if (!getUser) {
    //     return null;
    //   }

    //   const deleteEmployeeDocument =
    //     await context.prisma.user_document.deleteMany({
    //       where: {
    //         user_id: user_id,
    //         user_document_id: user_document_id,
    //       },
    //     });

    //   return `${deleteEmployeeDocument.count} document deleted!`;
    // },
    // deleteCompanyPortfolio: async (parent, args, context) => {
    //   let { user_id, company_id, guid } = args;

    //   let getCompany = await context.prisma.company.findUnique({
    //     where: { company_id: company_id },
    //   });

    //   if (!getCompany) {
    //     return null;
    //   }

    //   const deleteCompanyPortfolio =
    //     await context.prisma.company_portfolio.deleteMany({
    //       where: {
    //         company_id: company_id,
    //         guid: guid,
    //       },
    //     });

    //   return `${deleteCompanyPortfolio.count} portfolio deleted!`;
    // },
    // deleteEmployeePortfolio: async (parent, args, context) => {
    //   let { user_id, guid } = args;

    //   let getUser = await context.prisma.user.findUnique({
    //     where: { user_id: user_id },
    //   });

    //   if (!getUser) {
    //     return null;
    //   }

    //   const deleteEmployeePortfolio =
    //     await context.prisma.user_portfolio.deleteMany({
    //       where: {
    //         user_id: user_id,
    //         guid: guid,
    //       },
    //     });

    //   return `${deleteEmployeePortfolio.count} portfolio deleted!`;
    // },

    // ///uuuuu
    // EmployeePersonalDetails: async (parent, args, context) => {
    //   //---------------Security check------------------------
    //   const { user_id } = args;
    //   const { userTypeFromToken, userIdFromToken } = context;
    //   // if (user_id !== userIdFromToken) {
    //   //   throw new AuthenticationError("You must be logged in!");
    //   // }

    //   //console.log(user_id, userTypeFromToken, userIdFromToken);

    //   // Schema
    //   //   user_id: ID!

    //   // profile_picture: Upload

    //   // first_name: String!
    //   // middle_name: String
    //   // last_name: String!
    //   // gender: String!
    //   // date_of_birth: String!
    //   // social_security_no: String

    //   // emails: [String]!
    //   // contact_nos: [String]!
    //   // channels: [ChannelTypeWithURL]!
    //   // addresses: [EmployeeAddress]!
    //   // emergency_contact_details: EmergencyContactDetails!

    //   let getUser = await context.prisma.user.findUnique({
    //     where: { user_id: user_id },
    //   });

    //   if (!getUser) {
    //     return null;
    //   }

    //   let {
    //     profile_picture,
    //     first_name,
    //     middle_name,
    //     last_name,
    //     gender,
    //     date_of_birth,
    //     social_security_no,
    //     emails,
    //     contact_nos,
    //     channels,
    //     addresses,
    //     emergency_contact_details,
    //   } = args;

    //   let dataLocation = "";

    //   if (profile_picture) {
    //     //-------------- upload profile picture------------------

    //     const { createReadStream, filename, mimetype, encoding } =
    //       await profile_picture;

    //     const stream = createReadStream();

    //     let arr = filename.split(".");

    //     let name = arr[0];
    //     let ext = arr[1];

    //     let url = path.join(`${name}-${Date.now()}.${ext}`);

    //     function imageAndVideoUploadPromise() {
    //       return new Promise(async (resolve) => {
    //         const params = {
    //           Bucket: "crunos-internal-bucket", //backend-staging-bucket
    //           Key: url,
    //           Body: stream,
    //           ContentType: mimetype,
    //         };

    //         // Uploading files to the bucket
    //         s3.upload(params, function (err, data) {
    //           if (err) {
    //             //throw err;
    //             console.log(err);
    //             return "failure";
    //           }
    //           console.log(
    //             `Profile Picture uploaded successfully. ${data.Location}`
    //           );
    //           dataLocation = data.Location;
    //           resolve();
    //         });
    //       });
    //     }

    //     await imageAndVideoUploadPromise();
    //     //-------------- End Profile picture
    //   }

    //   let updatedData = {};

    //   updatedData.first_name = first_name;
    //   updatedData.last_name = last_name;
    //   updatedData.gender = gender;
    //   updatedData.date_of_birth = date_of_birth;

    //   if (dataLocation != "") {
    //     updatedData.profile_picture = dataLocation;
    //   }

    //   if (middle_name) {
    //     updatedData.middle_name = middle_name;
    //   } else {
    //     updatedData.middle_name = "";
    //   }

    //   if (social_security_no) {
    //     updatedData.social_security_no = social_security_no;
    //   } else {
    //     updatedData.social_security_no = "";
    //   }

    //   let updateEmployeeDetails = await context.prisma.user.update({
    //     where: {
    //       user_id: user_id,
    //     },
    //     data: updatedData,
    //   });

    //   //-------------- Update Address --------------------------

    //   let deleteExistingAddresses =
    //     await context.prisma.user_address.deleteMany({
    //       where: { user_id: user_id },
    //     });

    //   if (addresses.length > 0) {
    //     for (let i = 0; i < addresses.length; ++i) {
    //       updatedData = {};
    //       updatedData.address_type_id = addresses[i].address_type_id;
    //       updatedData.street_no = addresses[i].street_no;
    //       updatedData.country = addresses[i].country;
    //       updatedData.province = addresses[i].province;
    //       updatedData.city = addresses[i].city;
    //       updatedData.postal_zip_code = addresses[i].postal_zip_code;
    //       updatedData.user_id = user_id;

    //       if (addresses[i].street_no) {
    //         updatedData.street_no = addresses[i].street_no;
    //       }

    //       updatedData.user_id = user_id;

    //       // console.log(updatedData);

    //       updateEmployeeDetails = await context.prisma.user_address.create({
    //         data: updatedData,
    //       });
    //     }
    //   }

    //   //-------------- Update Email --------------------------

    //   let deleteExistingEmails = await context.prisma.user_email.deleteMany({
    //     where: { user_id: user_id, is_primary: false },
    //   });

    //   if (emails.length > 0) {
    //     for (let i = 0; i < emails.length; ++i) {
    //       //company_id;

    //       updateEmployeeDetails = await context.prisma.user_email.create({
    //         data: { email: emails[i], user_id: user_id },
    //       });
    //     }
    //   }

    //   //-------------- Update Contact Nos --------------------------

    //   let deleteExistingContactNos =
    //     await context.prisma.user_contact.deleteMany({
    //       where: { user_id: user_id, is_primary: false },
    //     });

    //   if (contact_nos.length > 0) {
    //     for (let i = 0; i < contact_nos.length; ++i) {
    //       //company_id;

    //       updateEmployeeDetails = await context.prisma.user_contact.create({
    //         data: { contact_no: contact_nos[i], user_id: user_id },
    //       });
    //     }
    //   }

    //   //company_channel

    //   //-------------- Update company_channel --------------------------

    //   let deleteExistingCompanyChannels =
    //     await context.prisma.user_channel.deleteMany({
    //       where: { user_id: user_id },
    //     });

    //   if (channels.length > 0) {
    //     for (let i = 0; i < channels.length; ++i) {
    //       //company_id;

    //       if (
    //         channels[i].channel_id === null ||
    //         channels[i].channel_id === "" ||
    //         channels[i].url === null ||
    //         channels[i].url === ""
    //       ) {
    //         continue;
    //       }

    //       updateEmployeeDetails = await context.prisma.user_channel.create({
    //         data: {
    //           channel_id: channels[i].channel_id,
    //           url: channels[i].url,
    //           user_id: user_id,
    //         },
    //       });
    //     }
    //   }

    //   //-------------- Update Company emergency details --------------------------

    //   let deleteExistingCompanyEmergencyDetails =
    //     await context.prisma.user_emergency_contact.deleteMany({
    //       where: { user_id: user_id },
    //     });

    //   if (
    //     emergency_contact_details.name !== null ||
    //     emergency_contact_details.name !== "" ||
    //     emergency_contact_details.mobile !== null ||
    //     emergency_contact_details.mobile !== ""
    //   ) {
    //     updateEmployeeDetails =
    //       await context.prisma.user_emergency_contact.create({
    //         data: {
    //           name: emergency_contact_details.name,
    //           mobile: emergency_contact_details.mobile,
    //           relationship: emergency_contact_details.relationship,
    //           email: emergency_contact_details.email,
    //           user_id: user_id,
    //         },
    //       });
    //   }

    //   //-------------- End Company emergency details-----------

    //   return "success";
    // },
    // // mark
    // EmployeeEducation: async (parent, args, context) => {
    //   //---------------Security check------------------------
    //   const { user_id } = args;
    //   const { userTypeFromToken, userIdFromToken } = context;
    //   // if (user_id !== userIdFromToken) {
    //   //   throw new AuthenticationError("You must be logged in!");
    //   // }

    //   //console.log(user_id, userTypeFromToken, userIdFromToken);

    //   // Schema
    //   // user_id: ID!
    //   // education_level: String!
    //   // course: String!
    //   // course_type: String!
    //   // university_institute: String!
    //   // passing_year: Int!
    //   // specialization: String!
    //   // skills: [input_skill!]!
    //   // industry_type_id: ID!
    //   // resume: Upload!
    //   // note: String
    //   // documents: [Upload]!

    //   //console.log(user_id);

    //   let getUser = await context.prisma.user.findUnique({
    //     where: { user_id: user_id },
    //   });

    //   if (!getUser) {
    //     return null;
    //   }

    //   let {
    //     education_level,
    //     course,
    //     course_type,
    //     university_institute,
    //     passing_year,
    //     specialization,
    //     skills,
    //     industry_type_id,
    //     resume,
    //     note,
    //     documents,
    //   } = args;

    //   let dataLocation = "";
    //   let resume_filename = "";

    //   let ExtensionList = [
    //     "jpg",
    //     "png",
    //     "gif",
    //     "tif",
    //     "webp",
    //     "bmp",
    //     "svg",
    //   ];

    //   let _is_image;
    //   let return_object = [];

    //   if (resume == "" || resume == null || resume == undefined) {
    //   } else if (!resume) {
    //   } else {
    //     //-------------- upload profile picture------------------

    //     const { createReadStream, filename, mimetype, encoding } = await resume;

    //     const stream = createReadStream();

    //     let arr = filename.split(".");

    //     let name = arr[0];
    //     let ext = arr[1];

    //     let url = path.join(`${name}-${Date.now()}.${ext}`);
    //     resume_filename = url;

    //     function imageAndVideoUploadPromise() {
    //       return new Promise(async (resolve) => {
    //         const params = {
    //           Bucket: "crunos-internal-bucket", //backend-staging-bucket
    //           Key: url,
    //           Body: stream,
    //           ContentType: mimetype,
    //         };

    //         // Uploading files to the bucket
    //         s3.upload(params, function (err, data) {
    //           if (err) {
    //             //throw err;
    //             console.log(err);
    //             return "failure";
    //           }
    //           console.log(`Resume uploaded successfully. ${data.Location}`);
    //           dataLocation = data.Location;
    //           resolve();
    //         });
    //       });
    //     }

    //     await imageAndVideoUploadPromise();
    //     //-------------- End Profile picture
    //   }

    //   let updatedData = {};

    //   if (resume_filename === "" || dataLocation === "") {
    //   } else {
    //     updatedData.resume = dataLocation;
    //     updatedData.resume_filename = resume_filename;
    //   }

    //   updatedData.education_level = education_level;
    //   updatedData.course = course;
    //   updatedData.course_type = course_type;
    //   updatedData.university_institute = university_institute;
    //   updatedData.passing_year = passing_year;
    //   updatedData.specialization = specialization;
    //   // updatedData.resume = dataLocation;
    //   // updatedData.resume_filename = resume_filename;
    //   updatedData.industry_type_id = industry_type_id;

    //   if (note) {
    //     updatedData.note = note;
    //   } else {
    //     updatedData.note = "";
    //   }

    //   // ----------------- Update employee education --------------------------------

    //   let getUserEducation = await context.prisma.user_eductaion.findMany({
    //     where: { user_id: user_id },
    //   });

    //   if (getUserEducation.length < 1) {
    //     updatedData.user_id = user_id;
    //     let createEmployeeEducation =
    //       await context.prisma.user_eductaion.create({
    //         data: updatedData,
    //       });
    //   } else {
    //     let updateEmployeeEducation =
    //       await context.prisma.user_eductaion.updateMany({
    //         where: {
    //           user_id: user_id,
    //         },
    //         data: updatedData,
    //       });
    //   }

    //   //-------------- Update employee_skills ----------------------------------------

    //   let deleteExistingEmployeeSkills =
    //     await context.prisma.user_skill.deleteMany({
    //       where: { user_id: user_id },
    //     });

    //   if (skills.length > 0) {
    //     for (let i = 0; i < skills.length; ++i) {
    //       //company_id;

    //       if (skills[i].skill_id === null || skills[i].skill_id === "") {
    //         continue;
    //       }

    //       updateEmployeeEducation = await context.prisma.user_skill.create({
    //         data: {
    //           skill_id: skills[i].skill_id,
    //           user_id: user_id,
    //         },
    //       });
    //     }
    //   }

    //   //------------------Documents Upload ----------------------

    //   function _imageAndVideoUploadPromise() {
    //     return new Promise(async (resolve) => {
    //       // ----------Upload Documents ------------------
    //       if (documents.length > 0) {
    //         for (let i = 0; i < documents.length; ++i) {
    //           const { createReadStream, filename, mimetype, encoding } =
    //             await documents[i].document;
    //           const stream = createReadStream();

    //           let arr = filename.split(".");

    //           let name = arr[0];
    //           let ext = arr[1];

    //           let url = path.join(`${name}-${Date.now()}.${ext}`);

    //           if (ExtensionList.includes(ext.toLowerCase())) {
    //             _is_image = true;
    //           } else {
    //             _is_image = false;
    //           }

    //           const params = {
    //             Bucket: "crunos-internal-bucket", //backend-staging-bucket
    //             Key: url,
    //             Body: stream,
    //             ContentType: mimetype,
    //           };

    //           // Uploading files to the bucket
    //           s3.upload(params, async function (err, data) {
    //             if (err) {
    //               //throw err;
    //               console.log(err);
    //               return "failure (" + filename + ")";
    //             }

    //             let insertDocumentInformationToDatabase =
    //               await context.prisma.user_document.create({
    //                 data: {
    //                   user_id: user_id,
    //                   document_url: data.Location,
    //                   filename: url,
    //                   extension: ext,
    //                   description: documents[i].description,
    //                 },
    //               });

    //             return_object.push({
    //               user_document_id:
    //                 insertDocumentInformationToDatabase.user_document_id,
    //               url: data.Location,
    //               is_image: _is_image,
    //               filename: url,
    //               description: documents[i].description,
    //             });

    //             documentUploadCount++;
    //             console.log("Document URL: ", data.Location);
    //             if (documentUploadCount === documents.length) {
    //               resolve();
    //             }

    //             //imageUploadURLArray.push({ filename: url, url: data.Location });
    //             // console.log(`File uploaded successfully. ${data.Location}`);
    //           });
    //         }
    //       } else {
    //         console.log("No document");
    //         resolve();
    //       }

    //       //------------documents Upload End---------
    //     });
    //   }

    //   await _imageAndVideoUploadPromise();

    //   //-------------------Documents Upload End------------------

    //   return return_object;
    // },
    // signup: async (parent, args, context) => {
    //   const { is_employer } = args;
    //   if (is_employer) {
    //     console.log("Employer");
    //     const { company_name, GST_number } = args;

    //     if (!company_name) {
    //       throw new UserInputError("Invalid argument value", {
    //         argumentName: "company_name",
    //       });
    //     }

    //     if (!GST_number) {
    //       throw new UserInputError("Invalid argument value", {
    //         argumentName: "GST_number",
    //       });
    //     }

    //     const insertCompany = await context.prisma.company.create({
    //       data: { company_name: company_name, GST_number: GST_number },
    //     });

    //     console.log(insertCompany);

    //     delete args.company_name;
    //     delete args.GST_number;

    //     args.company_id = insertCompany.company_id;

    //     const insertUser = await context.prisma.user.create({
    //       data: { ...args },
    //     });

    //     console.log(insertUser);

    //     insertUser.company_name = company_name;
    //     insertUser.GST_number = GST_number;

    //     return insertUser;
    //   } else {
    //     console.log("Employee");
    //     const { user_name, first_name, last_name, email, mobile_no } = args;
    //     delete args.company_name;
    //     delete args.GST_number;
    //     delete args.company_id;

    //     const usr = await context.prisma.user.create({
    //       data: { ...args },
    //     });

    //     return usr;
    //   }
    // },

    // verifyBySMS: async (parent, args, context) => {
    //   const { user_id, is_mobile_verified } = args;

    //   const user = await context.prisma.user.findUnique({
    //     where: {
    //       user_id: user_id,
    //     },
    //   });

    //   if (!user) {
    //     throw new UserInputError("Invalid argument value", {
    //       argumentName: "user_id",
    //     });
    //   }

    //   delete args.user_id;
    //   const updateUserActivation = await context.prisma.user.update({
    //     where: {
    //       user_id: user_id,
    //     },
    //     data: { ...args },
    //   });

    //   return updateUserActivation;
    // },
    // verifyByEmail: async (parent, args, context) => {
    //   const { user_id, is_email_verified } = args;

    //   const user = await context.prisma.user.findUnique({
    //     where: {
    //       user_id: user_id,
    //     },
    //   });

    //   if (!user) {
    //     throw new UserInputError("Invalid argument value", {
    //       argumentName: "user_id",
    //     });
    //   }

    //   delete args.user_id;
    //   const updateUserActivation = await context.prisma.user.update({
    //     where: {
    //       user_id: user_id,
    //     },
    //     data: { ...args },
    //   });

    //   return updateUserActivation;
    // },

    // addUser: async (parent, args, context) => {
    //   const usr = await context.prisma.user.create({
    //     data: { ...args },
    //   });
    //   console.log(usr);
    //   return usr;
    // },
    // addNote: async (parent, args, context) => {
    //   const nt = await context.prisma.Note.create({
    //     data: { ...args },
    //   });

    //   return nt;
    // },

    // addSeverity: async (parent, args, context) => {
    //   const svrty = await context.prisma.severity.create({
    //     data: { ...args },
    //   });
    //   return svrty;
    // },
    // addIncident: async (parent, args, context) => {
    //   let incdnt;
    //   let np = 0;

    //   let filepath = [];
    //   if (!args.file) {
    //     incdnt = await context.prisma.incident.create({
    //       data: { ...args },
    //     });

    //     // console.log(incdnt.incidentOwner);
    //     // console.log(incdnt.incidentId);
    //     incdnt.numOfFiles = 0;
    //     incdnt.filepath = filepath;
    //     return incdnt;
    //   }

    //   const { file } = args;
    //   delete args.file;

    //   incdnt = await context.prisma.incident.create({
    //     data: { ...args },
    //   });

    //   // console.log("Files: ", file.length);

    //   const isArrayofFiles = Array.isArray(file);

    //   if (isArrayofFiles) {
    //     numOfFiles = file.length;
    //     const user_id = "cab9082b-3b02-4455-829c-1f1a1619bdb3";
    //     const folder = "Incident_Documents";

    //     const s3 = new AWS.S3();

    //     for (let i = 0; i < file.length; ++i) {
    //       const { createReadStream, filename, mimetype, encoding } = await file[
    //         i
    //       ];

    //       // Invoking the `createReadStream` will return a Readable Stream.
    //       // See https://nodejs.org/api/stream.html#stream_readable_streams

    //       const stream = createReadStream();

    //       let arr = filename.split(".");

    //       let name = arr[0];
    //       let ext = arr[1];

    //       let url = path.join(`${name}-${Date.now()}.${ext}`);

    //       const params = {
    //         Bucket: "backend-staging-bucket/" + user_id + "/" + folder,
    //         Key: url,
    //         Body: stream,
    //         ContentType: mimetype,
    //       };

    //       try {
    //         const data = await s3
    //           .upload(params, {
    //             tags: [
    //               {
    //                 Key: "client",
    //                 Value: user_id,
    //               },
    //             ],
    //           })
    //           .promise();

    //         filepath.push(data.Location);

    //         const _document = {
    //           incidentId: incdnt.incidentId,
    //           ownerId: incdnt.incidentOwner,
    //           fileName: filename,
    //           resourceUrl: data.Location,
    //         };

    //         const dcmnt = await context.prisma.document.create({
    //           data: { ..._document },
    //         });
    //       } catch (err) {
    //         console.log(err);
    //       }
    //       // --- s3
    //     }
    //   }

    //   // for (let i = 0; i < file.length; ++i) {
    //   //   const { createReadStream, filename, mimetype, encoding } = await file[
    //   //     i
    //   //   ];

    //   //   // Invoking the `createReadStream` will return a Readable Stream.
    //   //   // See https://nodejs.org/api/stream.html#stream_readable_streams

    //   //   const stream = createReadStream();

    //   //   let arr = filename.split(".");

    //   //   let name = arr[0];
    //   //   let ext = arr[1];

    //   //   let url = path.join(
    //   //     __dirname,
    //   //     `../upload/${name}-${Date.now()}.${ext}`
    //   //   );

    //   //   // This is purely for demonstration purposes and will overwrite the
    //   //   // local-file-output.txt in the current working directory on EACH upload.
    //   //   const out = require("fs").createWriteStream(url);
    //   //   stream.pipe(out);
    //   //   await finished(out);
    //   // }

    //   incdnt.numOfFiles = numOfFiles;
    //   incdnt.filepath = filepath;
    //   return incdnt;
    // },
    // addIncidentWithFileArray: async (parent, args, context) => {
    //   //      "email": "firdouskhosa@gmail.com",
    //   //       "user_id": "72abd9a7-8306-4908-8ecc-38f1823ac2e1",
    //   //       "first_name": "firdous",
    //   //       "middle_name": " ",
    //   //       "last_name": "ahmad",
    //   //       "real_estate_id": " "

    //   //-------------Security Parameters-------------------

    //   const { userTypeFromToken, userIdFromToken } = context;

    //   //---------------------------------------------------

    //   let auto_generated_incident_id = "empty";
    //   const getIncidentCount = await context.prisma.unique_key_count.findUnique(
    //     {
    //       where: {
    //         id: 1,
    //       },
    //     }
    //   );

    //   auto_generated_incident_id = `INC-${getIncidentCount.incidentCount}`;

    //   const updateIncidentCount = await context.prisma.unique_key_count.update({
    //     where: {
    //       id: 1,
    //     },
    //     data: {
    //       incidentCount: getIncidentCount.incidentCount + 1,
    //     },
    //   });

    //   const { userInfo, businessOwners, contactReferences } = args;
    //   delete args.userInfo;
    //   delete args.businessOwners;
    //   delete args.contactReferences;

    //   const usr_id = userInfo.user_id;
    //   if (usr_id !== userIdFromToken) {
    //     throw new AuthenticationError("You must be logged in!");
    //   }

    //   let usr;
    //   usr = await context.prisma.user.findMany({
    //     where: { userId: usr_id },
    //   });

    //   if (usr.length < 1) {
    //     const newUser = {
    //       userId: userInfo.user_id,
    //       firstName: userInfo.first_name,
    //       middleName: userInfo.middle_name,
    //       lastName: userInfo.last_name,
    //       emailId: userInfo.email,
    //       real_estate_id: userInfo.real_estate_id,
    //       userType: userTypeFromToken.toLowerCase(),
    //       telephoneNumber: "+17804056507",
    //       mobilePhone: "+18552891374",
    //       profilePicture: "https://www.w3schools.com/howto/img_avatar.png",
    //     };
    //     usr = await context.prisma.user.create({
    //       data: { ...newUser },
    //     });
    //     console.log("New user created!");
    //   } else {
    //     console.log("User already exist!");
    //   }

    //   //-----------------Add status --------------------
    //   args.statusId = "STG-001";
    //   if (args.is_submitted) {
    //     args.statusId = "STG-002";
    //   }
    //   //------------------------------------------------

    //   let incdnt;
    //   let numOfFiles;
    //   let filepath = [];

    //   args.incidentOwner = usr_id;
    //   args.incidentId = auto_generated_incident_id;

    //   if (args.file.length > 0) {
    //     const { file } = args;
    //     delete args.file;

    //     incdnt = await context.prisma.incident.create({
    //       data: { ...args },
    //     });

    //     //------------Business Owner Start---------------
    //     // const isBusinessOwners =
    //     //   businessOwners && businessOwners.length > 0 ? true : false;

    //     // if (isBusinessOwners) {
    //     //   const delBusinessOwners =
    //     //     await context.prisma.BusinessOwners.deleteMany({
    //     //       where: {
    //     //         incidentId: incdnt.incidentId,
    //     //         userId: incdnt.incidentOwner,
    //     //       },
    //     //     });
    //     // }

    //     if (businessOwners && businessOwners.length > 0) {
    //       const delBusinessOwners =
    //         await context.prisma.BusinessOwners.deleteMany({
    //           where: {
    //             incidentId: incdnt.incidentId,
    //             userId: incdnt.incidentOwner,
    //           },
    //         });

    //       for (let i = 0; i < businessOwners.length; ++i) {
    //         businessOwners[i].incidentId = incdnt.incidentId;
    //         businessOwners[i].userId = incdnt.incidentOwner;

    //         const bsnsownr = await context.prisma.BusinessOwners.create({
    //           data: { ...businessOwners[i] },
    //         });
    //       }
    //     } else {
    //       const delBusinessOwners =
    //         await context.prisma.BusinessOwners.deleteMany({
    //           where: {
    //             incidentId: incdnt.incidentId,
    //             userId: incdnt.incidentOwner,
    //           },
    //         });
    //     }

    //     //------------Business Owner End---------------

    //     //------------Contact Referece Start---------------

    //     // const isContactReferences =
    //     //   contactReferences && contactReferences.length > 0 ? true : false;

    //     // if (isContactReferences) {
    //     //   const delContactReferences =
    //     //     await context.prisma.ContactReference.deleteMany({
    //     //       where: {
    //     //         incidentId: incdnt.incidentId,
    //     //         userId: incdnt.incidentOwner,
    //     //       },
    //     //     });
    //     // }

    //     if (contactReferences && contactReferences.length > 0) {
    //       const delContactReferences =
    //         await context.prisma.ContactReference.deleteMany({
    //           where: {
    //             incidentId: incdnt.incidentId,
    //             userId: incdnt.incidentOwner,
    //           },
    //         });
    //       for (let i = 0; i < contactReferences.length; ++i) {
    //         contactReferences[i].incidentId = incdnt.incidentId;
    //         contactReferences[i].userId = incdnt.incidentOwner;

    //         const cntctref = await context.prisma.ContactReference.create({
    //           data: { ...contactReferences[i] },
    //         });
    //       }
    //     } else {
    //       const delContactReferences =
    //         await context.prisma.ContactReference.deleteMany({
    //           where: {
    //             incidentId: incdnt.incidentId,
    //             userId: incdnt.incidentOwner,
    //           },
    //         });
    //     }

    //     //------------Contact Referece End---------------

    //     numOfFiles = file.length;

    //     for (let i = 0; i < file.length; ++i) {
    //       filepath.push(file[i].resourceUrl);

    //       const _document = {
    //         incidentId: incdnt.incidentId,
    //         ownerId: incdnt.incidentOwner,
    //         fileName: file[i].filename,
    //         resourceUrl: file[i].resourceUrl,
    //         fileSize: file[i].fileSize,
    //         documentFileTypeId: file[i].documentFileTypeId,
    //       };

    //       const dcmnt = await context.prisma.document.create({
    //         data: { ..._document },
    //       });
    //     }

    //     incdnt.numOfFiles = numOfFiles;
    //     incdnt.filepath = filepath;
    //     return incdnt;
    //   } else {
    //     delete args.file;
    //     incdnt = await context.prisma.incident.create({
    //       data: { ...args },
    //     });

    //     //------------Business Owner Start---------------

    //     if (businessOwners && businessOwners.length > 0) {
    //       const delBusinessOwners =
    //         await context.prisma.BusinessOwners.deleteMany({
    //           where: {
    //             incidentId: incdnt.incidentId,
    //             userId: incdnt.incidentOwner,
    //           },
    //         });

    //       for (let i = 0; i < businessOwners.length; ++i) {
    //         businessOwners[i].incidentId = incdnt.incidentId;
    //         businessOwners[i].userId = incdnt.incidentOwner;

    //         const bsnsownr = await context.prisma.BusinessOwners.create({
    //           data: { ...businessOwners[i] },
    //         });
    //       }
    //     } else {
    //       const delBusinessOwners =
    //         await context.prisma.BusinessOwners.deleteMany({
    //           where: {
    //             incidentId: incdnt.incidentId,
    //             userId: incdnt.incidentOwner,
    //           },
    //         });
    //     }

    //     //------------Business Owner End---------------

    //     //------------Contact Referece Start---------------

    //     if (contactReferences && contactReferences.length > 0) {
    //       const delContactReferences =
    //         await context.prisma.ContactReference.deleteMany({
    //           where: {
    //             incidentId: incdnt.incidentId,
    //             userId: incdnt.incidentOwner,
    //           },
    //         });
    //       for (let i = 0; i < contactReferences.length; ++i) {
    //         contactReferences[i].incidentId = incdnt.incidentId;
    //         contactReferences[i].userId = incdnt.incidentOwner;

    //         const cntctref = await context.prisma.ContactReference.create({
    //           data: { ...contactReferences[i] },
    //         });
    //       }
    //     } else {
    //       const delContactReferences =
    //         await context.prisma.ContactReference.deleteMany({
    //           where: {
    //             incidentId: incdnt.incidentId,
    //             userId: incdnt.incidentOwner,
    //           },
    //         });
    //     }

    //     //------------Contact Referece End---------------

    //     incdnt.numOfFiles = 0;
    //     incdnt.filepath = filepath;
    //     return incdnt;
    //   }
    // },
    // updateIncidentWithFileArray: async (parent, args, context) => {
    //   let {
    //     userId,
    //     incidentId,
    //     components,
    //     transferChain,
    //     businessOwners,
    //     contactReferences,
    //   } = args;

    //   const { userTypeFromToken, userIdFromToken } = context;

    //   if (userId !== userIdFromToken) {
    //     throw new AuthenticationError("You must be logged in!");
    //   }

    //   // console.log(userType);
    //   // console.log(components);
    //   // console.log(transferChain);

    //   delete args.userId;
    //   delete args.incidentId;
    //   delete args.components;
    //   delete args.transferChain;
    //   delete args.userType;
    //   delete args.businessOwners;
    //   delete args.contactReferences;

    //   // if (!Array.isArray(components)) {
    //   //components = components[0].trim();
    //   //components = components[0].split(",");

    //   //components = [...new Set(components)];
    //   // }

    //   // if (!Array.isArray(transferChain)) {
    //   //transferChain = transferChain[0].trim();
    //   //transferChain = transferChain[0].split(",");

    //   //transferChain = [...new Set(transferChain)];

    //   // }

    //   // console.log(components);
    //   // console.log(transferChain);

    //   const isComponentsExist =
    //     components && components.length > 0 ? true : false;
    //   const istransferChainExist =
    //     transferChain && transferChain.length > 0 ? true : false;

    //   //remove duplicate from components
    //   if (isComponentsExist) {
    //     components = [...new Set(components)];
    //   }

    //   //--------------------exist or not

    //   const usr = await context.prisma.user.findMany({
    //     where: { userId: userId },
    //   });

    //   let inc;

    //   if (userTypeFromToken === "Triage") {
    //     //delete args.is_submitted;
    //     console.log("TRIAGE user want to update incident!");
    //     inc = await context.prisma.incident.findMany({
    //       where: {
    //         incidentId: incidentId,
    //         isDeleted: false,
    //         // is_submitted: true,
    //       },
    //     });
    //   } else {
    //     inc = await context.prisma.incident.findMany({
    //       where: {
    //         incidentId: incidentId,
    //         isDeleted: false,
    //         is_submitted: false,
    //       },
    //     });
    //   }

    //   if (usr.length > 0 && inc.length > 0) {
    //     console.log("Incident found!");

    //     //---------------If alaready submitted than no change in is_submitted----------
    //     if (inc[0].is_submitted) {
    //       delete args.is_submitted;
    //     }

    //     //---------incident update logic
    //     let incdnt;
    //     let numOfFiles;
    //     let filepath = [];

    //     args.incidentOwner = userId;

    //     if (args.file.length > 0) {
    //       const { file } = args;
    //       delete args.file;

    //       // incdnt = await context.prisma.incident.create({
    //       //   data: { ...args },
    //       // });

    //       const updateUser = await context.prisma.incident.update({
    //         where: {
    //           incidentId: incidentId,
    //           //incidentOwner: userId,
    //         },
    //         data: { ...args },
    //       });

    //       //------------Business Owner Start---------------

    //       if (businessOwners && businessOwners.length > 0) {
    //         const delBusinessOwners =
    //           await context.prisma.BusinessOwners.deleteMany({
    //             where: {
    //               incidentId: updateUser.incidentId,
    //               userId: updateUser.incidentOwner,
    //             },
    //           });

    //         for (let i = 0; i < businessOwners.length; ++i) {
    //           businessOwners[i].incidentId = updateUser.incidentId;
    //           businessOwners[i].userId = updateUser.incidentOwner;

    //           const bsnsownr = await context.prisma.BusinessOwners.create({
    //             data: { ...businessOwners[i] },
    //           });
    //         }
    //       } else {
    //         const delBusinessOwners =
    //           await context.prisma.BusinessOwners.deleteMany({
    //             where: {
    //               incidentId: updateUser.incidentId,
    //               userId: updateUser.incidentOwner,
    //             },
    //           });
    //       }

    //       //------------Business Owner End---------------

    //       //------------Contact Referece Start---------------

    //       if (contactReferences && contactReferences.length > 0) {
    //         const delContactReferences =
    //           await context.prisma.ContactReference.deleteMany({
    //             where: {
    //               incidentId: updateUser.incidentId,
    //               userId: updateUser.incidentOwner,
    //             },
    //           });
    //         for (let i = 0; i < contactReferences.length; ++i) {
    //           contactReferences[i].incidentId = updateUser.incidentId;
    //           contactReferences[i].userId = updateUser.incidentOwner;

    //           const cntctref = await context.prisma.ContactReference.create({
    //             data: { ...contactReferences[i] },
    //           });
    //         }
    //       } else {
    //         const delContactReferences =
    //           await context.prisma.ContactReference.deleteMany({
    //             where: {
    //               incidentId: updateUser.incidentId,
    //               userId: updateUser.incidentOwner,
    //             },
    //           });
    //       }

    //       //------------Contact Referece End---------------

    //       numOfFiles = file.length;

    //       for (let i = 0; i < file.length; ++i) {
    //         filepath.push(file[i].resourceUrl);

    //         const _document = {
    //           incidentId: incidentId,
    //           ownerId: userId,
    //           fileName: file[i].filename,
    //           resourceUrl: file[i].resourceUrl,
    //           fileSize: file[i].fileSize,
    //           documentFileTypeId: file[i].documentFileTypeId,
    //         };

    //         const dcmnt = await context.prisma.document.create({
    //           data: { ..._document },
    //         });
    //       }

    //       updateUser.numOfFiles = numOfFiles;
    //       updateUser.filepath = filepath;

    //       //-----------Component update logic
    //       let comp;
    //       let obj;
    //       if (isComponentsExist) {
    //         comp = await context.prisma.components.deleteMany({
    //           where: { incidentId: incidentId },
    //         });

    //         for (let i = 0; i < components.length; ++i) {
    //           obj = {
    //             incidentId: incidentId,
    //             tagId: components[i],
    //           };
    //           comp = await context.prisma.components.create({
    //             data: { ...obj },
    //           });
    //         }
    //       } else {
    //         comp = await context.prisma.components.deleteMany({
    //           where: { incidentId: incidentId },
    //         });
    //       }
    //       //-----------Component update logic end

    //       //-=--------TransferChain Update Logic
    //       let trsfrchn;
    //       if (istransferChainExist) {
    //         trsfrchn = await context.prisma.TransferChain.deleteMany({
    //           where: { incidentId: incidentId },
    //         });

    //         for (let i = 0; i < transferChain.length; ++i) {
    //           obj = {
    //             incidentId: incidentId,
    //             Name: transferChain[i],
    //           };
    //           trsfrchn = await context.prisma.TransferChain.create({
    //             data: { ...obj },
    //           });
    //         }
    //       } else {
    //         trsfrchn = await context.prisma.TransferChain.deleteMany({
    //           where: { incidentId: incidentId },
    //         });
    //       }
    //       //----------TransferChain update logic end

    //       return updateUser;
    //     } else {
    //       delete args.file;
    //       // incdnt = await context.prisma.incident.create({
    //       //   data: { ...args },
    //       // });

    //       const updateUser = await context.prisma.incident.update({
    //         where: {
    //           incidentId: incidentId,
    //           //incidentOwner: userId,
    //         },
    //         data: { ...args },
    //       });

    //       //------------Business Owner Start---------------

    //       if (businessOwners && businessOwners.length > 0) {
    //         const delBusinessOwners =
    //           await context.prisma.BusinessOwners.deleteMany({
    //             where: {
    //               incidentId: updateUser.incidentId,
    //               userId: updateUser.incidentOwner,
    //             },
    //           });

    //         for (let i = 0; i < businessOwners.length; ++i) {
    //           businessOwners[i].incidentId = updateUser.incidentId;
    //           businessOwners[i].userId = updateUser.incidentOwner;

    //           const bsnsownr = await context.prisma.BusinessOwners.create({
    //             data: { ...businessOwners[i] },
    //           });
    //         }
    //       } else {
    //         const delBusinessOwners =
    //           await context.prisma.BusinessOwners.deleteMany({
    //             where: {
    //               incidentId: updateUser.incidentId,
    //               userId: updateUser.incidentOwner,
    //             },
    //           });
    //       }

    //       //------------Business Owner End---------------

    //       //------------Contact Referece Start---------------

    //       if (contactReferences && contactReferences.length > 0) {
    //         const delContactReferences =
    //           await context.prisma.ContactReference.deleteMany({
    //             where: {
    //               incidentId: updateUser.incidentId,
    //               userId: updateUser.incidentOwner,
    //             },
    //           });
    //         for (let i = 0; i < contactReferences.length; ++i) {
    //           contactReferences[i].incidentId = updateUser.incidentId;
    //           contactReferences[i].userId = updateUser.incidentOwner;

    //           const cntctref = await context.prisma.ContactReference.create({
    //             data: { ...contactReferences[i] },
    //           });
    //         }
    //       } else {
    //         const delContactReferences =
    //           await context.prisma.ContactReference.deleteMany({
    //             where: {
    //               incidentId: updateUser.incidentId,
    //               userId: updateUser.incidentOwner,
    //             },
    //           });
    //       }

    //       //------------Contact Referece End---------------

    //       updateUser.numOfFiles = 0;
    //       updateUser.filepath = filepath;

    //       //-----------Component update logic
    //       let comp;
    //       let obj;

    //       if (isComponentsExist) {
    //         comp = await context.prisma.components.deleteMany({
    //           where: { incidentId: incidentId },
    //         });
    //         console.log(components.length);
    //         for (let i = 0; i < components.length; ++i) {
    //           obj = {
    //             incidentId: incidentId,
    //             tagId: components[i],
    //           };
    //           comp = await context.prisma.components.create({
    //             data: { ...obj },
    //           });
    //         }
    //       } else {
    //         comp = await context.prisma.components.deleteMany({
    //           where: { incidentId: incidentId },
    //         });
    //       }
    //       //-----------Component update logic end

    //       //-=--------TransferChain Update Logic
    //       let trsfrchn;
    //       if (istransferChainExist) {
    //         trsfrchn = await context.prisma.TransferChain.deleteMany({
    //           where: { incidentId: incidentId },
    //         });
    //         console.log("How much delete", trsfrchn);

    //         for (let i = 0; i < transferChain.length; ++i) {
    //           obj = {
    //             incidentId: incidentId,
    //             Name: transferChain[i],
    //           };
    //           trsfrchn = await context.prisma.TransferChain.create({
    //             data: { ...obj },
    //           });
    //         }
    //       } else {
    //         trsfrchn = await context.prisma.TransferChain.deleteMany({
    //           where: { incidentId: incidentId },
    //         });
    //       }
    //       //----------TransferChain update logic end

    //       return updateUser;
    //     }

    //     //----------incident updaate logic end
    //   } else {
    //     console.log("Incident not found!");
    //     return null;
    //   }

    //   //-----------------------------------
    // }, // end of update incident with file array
    // sendEmail: async (parent, args, context) => {
    //   let eml;
    //   let numOfFiles = 0;
    //   let filepath = [];
    //   if (args.file && args.file.length > 0) {
    //     const { file } = args;
    //     delete args.file;

    //     eml = await context.prisma.email.create({
    //       data: { ...args },
    //     });

    //     numOfFiles = file.length;
    //     for (let i = 0; i < file.length; ++i) {
    //       filepath.push(file[i].resourceUrl);
    //       const _document = {
    //         emailId: eml.emailId,
    //         fileName: file[i].filename,
    //         resourceUrl: file[i].resourceUrl,
    //         fileSize: file[i].fileSize,
    //         documentFileTypeId: file[i].documentFileTypeId,
    //       };

    //       const dcmnt = await context.prisma.emailDocuments.create({
    //         data: { ..._document },
    //       });
    //     }

    //     eml.numOfFiles = numOfFiles;
    //     eml.filepath = filepath;

    //     return eml;
    //   } else {
    //     delete args.file;
    //     eml = await context.prisma.email.create({
    //       data: { ...args },
    //     });

    //     eml.numOfFiles = numOfFiles;
    //     eml.filepath;

    //     return eml;
    //   }
    // },
    // sendSMS: async (parent, args, context) => {
    //   let sms;
    //   sms = await context.prisma.SMS.create({
    //     data: { ...args },
    //   });

    //   return sms;
    // },
    // singleUpload: async (parent, { file }) => {
    //   const { createReadStream, filename, mimetype, encoding } = await file;

    //   const stream = createReadStream();

    //   // --- s3

    //   const user_id = "cab9082b-3b02-4455-829c-1f1a1619bdb3";
    //   const folder = "Incident_Documents";
    //   let filepath = [];

    //   let arr = filename.split(".");

    //   let name = arr[0];
    //   let ext = arr[1];

    //   let url = path.join(`${name}-${Date.now()}.${ext}`);

    //   const params = {
    //     Bucket: "backend-staging-bucket/" + user_id + "/" + folder,
    //     Key: url,
    //     Body: stream,
    //     ContentType: mimetype,
    //   };

    //   try {
    //     const data = await s3
    //       .upload(params, {
    //         tags: [
    //           {
    //             Key: "client",
    //             Value: user_id,
    //           },
    //         ],
    //       })
    //       .promise();

    //     filepath.push(data.Location);
    //   } catch (err) {
    //     console.log(err);
    //   }
    //   // --- s3
    //   // let arr = filename.split(".");

    //   // let name = arr[0];
    //   // let ext = arr[1];

    //   // let url = path.join(__dirname, `../upload/${name}-${Date.now()}.${ext}`);

    //   // // This is purely for demonstration purposes and will overwrite the
    //   // // local-file-output.txt in the current working directory on EACH upload.
    //   // const out = require("fs").createWriteStream(url);
    //   // stream.pipe(out);
    //   // await finished(out);

    //   return { filename, mimetype, encoding, filepath };
    // },
    // deleteNewlyCreatedIncident: async (parent, args, context) => {
    //   let noOfIncidents = 0;

    //   const { userId, IncidentId } = args;

    //   const { userTypeFromToken, userIdFromToken } = context;
    //   if (userId !== userIdFromToken) {
    //     throw new AuthenticationError("You must be logged in!");
    //   }

    //   const incdnt = await context.prisma.incident.findMany({
    //     where: { incidentId: IncidentId, incidentOwner: userId },
    //   });

    //   if (incdnt.length > 0) {
    //     console.log("Record found!");
    //     if (incdnt[0].is_submitted) {
    //       console.log("Submitted!");
    //       // const deleteDocuments = await context.prisma.document.updateMany({
    //       //   where: {
    //       //     ownerId: userId,
    //       //     incidentId: IncidentId,
    //       //   },
    //       //   data: {
    //       //     isDeleted: true,
    //       //     deletedBy: userId,
    //       //     deletedAt: new Date(),
    //       //   },
    //       // });

    //       // const deleteIncident = await context.prisma.incident.updateMany({
    //       //   where: {
    //       //     incidentOwner: userId,
    //       //     incidentId: IncidentId,
    //       //   },
    //       //   data: {
    //       //     isDeleted: true,
    //       //     deletedBy: userId,
    //       //     deletedAt: new Date(),
    //       //   },
    //       // });

    //       // noOfDocuments = deleteDocuments.count;
    //       // noOfIncidents = deleteIncident.count;
    //       // draft_or_submitted = "submitted";

    //       return { noOfIncidents };
    //     } else {
    //       console.log("Draft!");

    //       const deleteIncident = await context.prisma.incident.deleteMany({
    //         where: {
    //           incidentOwner: userId,
    //           incidentId: IncidentId,
    //         },
    //       });

    //       if (deleteIncident.count > 0) {
    //         const getIncidentCount =
    //           await context.prisma.unique_key_count.findUnique({
    //             where: {
    //               id: 1,
    //             },
    //           });

    //         const updateIncidentCount =
    //           await context.prisma.unique_key_count.update({
    //             where: {
    //               id: 1,
    //             },
    //             data: {
    //               incidentCount: getIncidentCount.incidentCount - 1,
    //             },
    //           });
    //       }

    //       noOfIncidents = deleteIncident.count;
    //       return { noOfIncidents };
    //     }
    //   } else {
    //     console.log("Record not found!");
    //     return { noOfIncidents };
    //   }
    // },
    // startAndStopEC2: async (parent, args, context) => {
    //   let responseFlag = "none";
    //   const { instanceId, region, option } = args;

    //       region: region, //Region
    //     });

    //     // Create EC2 service object
    //     var ec2 = new AWS.EC2({ apiVersion: "2016-11-15" });

    //     var params = {
    //       InstanceIds: [instanceId],
    //       DryRun: true,
    //     };

    // //--------------------------------
    // function timeout() {
    //   return new Promise((resolve) => {
    //     ec2.startInstances(params, function (err, data) {
    //       if (err && err.code === "DryRunOperation") {
    //         params.DryRun = false;
    //         ec2.startInstances(params, function (err, data) {
    //           if (err) {
    //             responseFlag = "failure";
    //             resolve();
    //           } else if (data) {
    //             responseFlag = "success";
    //             resolve();
    //           }
    //         });
    //       } else {
    //         // return { message: "failure: permission" };
    //         console.log("You don't have permission to start instances.");
    //       }
    //     });
    //   });
    // }

    // await timeout();

    // if (responseFlag === "failure") {
    //   return { message: "start: failure" };
    // } else if (responseFlag === "success") {
    //   return { message: "start: success" };
    // }
    //     //---------------------------------

    //     // Create EC2 service object
    //     var ec2 = new AWS.EC2({ apiVersion: "2016-11-15" });
    //     // setup instance params
    //     const params = {
    //       InstanceIds: [instanceId],
    //     };

    //     function timeout() {
    //       return new Promise((resolve) => {
    //         ec2.stopInstances(params, function (err, data) {
    //           if (err) {
    //             console.log("failure");
    //             responseFlag = "failure";
    //             resolve();
    //             //console.log(err, err.stack); // an error occurred
    //           } else {
    //             console.log("success");
    //             responseFlag = "success";
    //             resolve();
    //             //console.log(data); // successful response
    //             //req.flash("success", "Successfuly your instance is stopped");
    //             // res.redirect("/aws");
    //           }
    //         });
    //       });
    //     }

    //     await timeout();

    //     if (responseFlag === "failure") {
    //       return { message: "stop: failure" };
    //     } else if (responseFlag === "success") {
    //       return { message: "stop: success" };
    //     }
    //   } else {
    //     return { message: "Invalid option!" };
    //   }

    //   return null;
    // },
    // deleteIncident: async (parent, args, context) => {
    //   let noOfIncidents = 0;

    //   const { userId, IncidentId } = args;

    //   const { userTypeFromToken, userIdFromToken } = context;
    //   if (userId !== userIdFromToken) {
    //     throw new AuthenticationError("You must be logged in!");
    //   }

    //   const incdnt = await context.prisma.incident.findMany({
    //     where: { incidentId: IncidentId, incidentOwner: userId },
    //   });

    //   if (incdnt.length > 0) {
    //     console.log("Record found!");
    //     if (incdnt[0].is_submitted) {
    //       console.log("Submitted!");
    //       // const deleteDocuments = await context.prisma.document.updateMany({
    //       //   where: {
    //       //     ownerId: userId,
    //       //     incidentId: IncidentId,
    //       //   },
    //       //   data: {
    //       //     isDeleted: true,
    //       //     deletedBy: userId,
    //       //     deletedAt: new Date(),
    //       //   },
    //       // });

    //       // const deleteIncident = await context.prisma.incident.updateMany({
    //       //   where: {
    //       //     incidentOwner: userId,
    //       //     incidentId: IncidentId,
    //       //   },
    //       //   data: {
    //       //     isDeleted: true,
    //       //     deletedBy: userId,
    //       //     deletedAt: new Date(),
    //       //   },
    //       // });

    //       // noOfDocuments = deleteDocuments.count;
    //       // noOfIncidents = deleteIncident.count;
    //       // draft_or_submitted = "submitted";

    //       return { noOfIncidents };
    //     } else {
    //       console.log("Draft!");

    //       const deleteIncident = await context.prisma.incident.deleteMany({
    //         where: {
    //           incidentOwner: userId,
    //           incidentId: IncidentId,
    //         },
    //       });

    //       noOfIncidents = deleteIncident.count;
    //       return { noOfIncidents };
    //     }
    //   } else {
    //     console.log("Record not found!");
    //     return { noOfIncidents };
    //   }
    // },
    // deleteAllDraftIncident: async (parent, args, context) => {
    //   let noOfIncidents = 0;

    //   const { userId } = args;
    //   const { userTypeFromToken, userIdFromToken } = context;
    //   if (userId !== userIdFromToken) {
    //     throw new AuthenticationError("You must be logged in!");
    //   }

    //   const incdnt = await context.prisma.incident.findMany({
    //     where: { incidentOwner: userId, is_submitted: false },
    //   });

    //   if (incdnt.length > 0) {
    //     console.log("Record found!");
    //     console.log("Draft!");

    //     // let deleteDocuments;
    //     let deleteIncident;
    //     // let deleteBusinessOwners;
    //     // let deleteContactReference;
    //     // let deleteEmail;
    //     // let deleteSMS;
    //     // let deleteNote;

    //     // for (let i = 0; i < incdnt.length; ++i) {
    //     //   deleteDocuments = await context.prisma.document.deleteMany({
    //     //     where: {
    //     //       incidentId: incdnt[i].incidentId,
    //     //       ownerId: userId,
    //     //     },
    //     //   });

    //     //   deleteBusinessOwners = await context.prisma.BusinessOwners.deleteMany(
    //     //     {
    //     //       where: {
    //     //         incidentId: incdnt[i].incidentId,
    //     //         userId: userId,
    //     //       },
    //     //     }
    //     //   );

    //     //   deleteContactReference =
    //     //     await context.prisma.ContactReference.deleteMany({
    //     //       where: {
    //     //         incidentId: incdnt[i].incidentId,
    //     //         userId: userId,
    //     //       },
    //     //     });

    //     //   // deleteEmailDocuments = await context.prisma.email.deleteMany({
    //     //   //   where: {
    //     //   //     incidentId: incdnt[i].incidentId,
    //     //   //     userId: userId,
    //     //   //   },
    //     //   // });

    //     //   deleteEmail = await context.prisma.email.deleteMany({
    //     //     where: {
    //     //       incidentId: incdnt[i].incidentId,
    //     //       userId: userId,
    //     //     },
    //     //   });

    //     //   deleteSMS = await context.prisma.SMS.deleteMany({
    //     //     where: {
    //     //       incidentId: incdnt[i].incidentId,
    //     //       userId: userId,
    //     //     },
    //     //   });

    //     //   deleteNote = await context.prisma.note.deleteMany({
    //     //     where: {
    //     //       incidentId: incdnt[i].incidentId,
    //     //       userId: userId,
    //     //     },
    //     //   });

    //     //   noOfDocuments += deleteDocuments.count;
    //     // }

    //     // console.log("All document deleted!: ", deleteDocuments.count);

    //     deleteIncident = await context.prisma.incident.deleteMany({
    //       where: { incidentOwner: userId, is_submitted: false },
    //     });

    //     console.log(deleteIncident);
    //     noOfIncidents += deleteIncident.count;
    //     // console.log("All incident deleted!: ", deleteIncident.count);

    //     // const transaction = await context.prisma.$transaction([
    //     //   deleteDocuments,
    //     //   deleteIncident,
    //     // ]);

    //     // console.log(transaction);

    //     return { noOfIncidents };
    //   } else {
    //     console.log("Record not found!");
    //     return { noOfIncidents };
    //   }
    // },
    // deleteMultipleDraftIncident: async (parent, args, context) => {
    //   const { incidentIds, ownerId } = args;
    //   const { userTypeFromToken, userIdFromToken } = context;

    //   if (ownerId !== userIdFromToken) {
    //     throw new AuthenticationError("You must be logged in!");
    //   }

    //   let noOfIncidents = 0;

    //   if (incidentIds.length > 0) {
    //     console.log("Record found!");
    //     console.log("Draft!");

    //     let deleteIncident;

    //     let incdnt;
    //     for (let i = 0; i < incidentIds.length; ++i) {
    //       // incdnt = await context.prisma.incident.findMany({
    //       //   where: {
    //       //     incidentId: incidentIds[i],
    //       //     incidentOwner: ownerId,
    //       //     is_submitted: false,
    //       //   },
    //       // });

    //       // if (incdnt.length > 0 && !incdnt[0].is_submitted) {
    //       // deleteDocuments = await context.prisma.document.deleteMany({
    //       //   where: {
    //       //     incidentId: incidentIds[i],
    //       //     ownerId: ownerId,
    //       //   },
    //       // });

    //       // noOfDocuments += deleteDocuments.count;

    //       deleteIncident = await context.prisma.incident.deleteMany({
    //         where: {
    //           incidentId: incidentIds[i],
    //           incidentOwner: ownerId,
    //           is_submitted: false,
    //         },
    //       });

    //       noOfIncidents += deleteIncident.count;
    //       // } else {
    //       //   continue;
    //       // }
    //     }

    //     return { noOfIncidents };
    //   } else {
    //     console.log("Record not found!");
    //     return { noOfIncidents };
    //   }
    // },
    // deleteDocument: async (parent, args, context) => {
    //   const { documentId, incidentId, ownerId } = args;

    //   const deleteDocuments = await context.prisma.document.deleteMany({
    //     where: {
    //       documentId: documentId,
    //       ownerId: ownerId,
    //       incidentId: incidentId,
    //     },
    //   });

    //   console.log(deleteDocuments);

    //   return { noOfDocuments: deleteDocuments.count };
    // },

    // addIncident: async (parent, args, context) => {
    //   const { incidentOwner } = args;
    //   args["incidentId"] = uuid();
    //   const isExist = users.find((user) => user.userId === incidentOwner);
    //   if (!isExist) return null;
    //   incidents.push({ ...args });
    //   //console.log(incidents[incidents.length - 1]);
    //   return incidents[incidents.length - 1];
    // },
  },
};

module.exports = { resolvers };

// //-------------customer test lat long ------------
// exports.test_lat_log = function (req, res) {
//   var obj = new Array();
//   var obj2 = new Array();
//   // var centerPoint = { lat: 31.571868, lng: 74.3309312 }; // office lat long
//   var centerPoint = { lat: 31.506432, lng: 74.32437759999999 }; // model town lat long

//   driver_lat_long.findAll().then((Loc) => {
//     if (Loc != null || Loc != "") {
//       Loc.forEach((element) => {
//         var checkPoint = { lat: element.latitude, lng: element.longitude };
//         var n = arePointsNear(checkPoint, centerPoint, 5);
//         if (n == true) {
//           obj.push(element.dataValues);
//         }
//       });
//       var unit = "K";
//       obj.forEach((item) => {
//         var n = distance(
//           centerPoint.lat,
//           centerPoint.lng,
//           item.latitude,
//           item.longitude,
//           unit
//         );

//         item.distance = n;
//         obj2.push(item);
//       });
//       obj2.sort(function (a, b) {
//         var alc = a.distance,
//           blc = b.distance;
//         return alc > blc ? 1 : alc < blc ? -1 : 0;
//       });
//       console.log(obj2);
//     }
//   });
// };

// function arePointsNear(checkPoint, centerPoint, km) {
//   var ky = 40000 / 360;
//   var kx = Math.cos((Math.PI * centerPoint.lat) / 180.0) * ky;
//   var dx = Math.abs(centerPoint.lng - checkPoint.lng) * kx;
//   var dy = Math.abs(centerPoint.lat - checkPoint.lat) * ky;
//   return Math.sqrt(dx * dx + dy * dy) <= km;
// }

// function distance(lat1, lon1, lat2, lon2, unit) {
//   if (lat1 == lat2 && lon1 == lon2) {
//     return 0;
//   } else {
//     var radlat1 = (Math.PI * lat1) / 180;
//     var radlat2 = (Math.PI * lat2) / 180;
//     var theta = lon1 - lon2;
//     var radtheta = (Math.PI * theta) / 180;
//     var dist =
//       Math.sin(radlat1) * Math.sin(radlat2) +
//       Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
//     if (dist > 1) {
//       dist = 1;
//     }
//     dist = Math.acos(dist);
//     dist = (dist * 180) / Math.PI;
//     dist = dist * 60 * 1.1515;
//     if (unit == "K") {
//       dist = dist * 1.609344;
//     }
//     if (unit == "N") {
//       dist = dist * 0.8684;
//     }
//     return dist;/
//   }
// }

// //-------------customer test lat long ------------
// exports.test_lat_log = function (req, res) {
//   var obj = new Array();
//   var obj2 = new Array();
//   // var centerPoint = { lat: 31.571868, lng: 74.3309312 }; // office lat long
//   var centerPoint = { lat: 31.506432, lng: 74.32437759999999 }; // model town lat long

//   driver_lat_long.findAll().then((Loc) => {
//     if (Loc != null || Loc != "") {
//       Loc.forEach((element) => {
//         var checkPoint = { lat: element.latitude, lng: element.longitude };
//         var n = arePointsNear(checkPoint, centerPoint, 25);
//         if (n == true) {
//           obj.push(element.dataValues);
//         }
//       });
//       var unit = "K";
//       obj.forEach((item) => {
//         var n = distance(
//           centerPoint.lat,
//           centerPoint.lng,
//           item.latitude,
//           item.longitude,
//           unit
//         );

//         item.distance = n;
//         obj2.push(item);
//       });
//       obj2.sort(function (a, b) {
//         var alc = a.distance,
//           blc = b.distance;
//         return alc > blc ? 1 : alc < blc ? -1 : 0;
//       });
//       console.log(obj2);
//     }
//   });
// };
