const express = require("express");
const os = require("os");
const multer = require("multer");
const readXlsxFile = require("read-excel-file/node");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
var router = express.Router();

const parseFollowers = (followers) => {
  console.log(followers.includes("M"));
  if (followers.includes("M")) {
    return Number(followers.replace(/\D/g, "")) * 1000000;
  }
  if (followers.includes("K")) {
    return Number(followers.replace(/\D/g, "")) * 1000;
  }
  return followers;
};

/* GET home page. */
router.get("/", async function (req, res, next) {
  res.render("index", {
    accounts: {
      fullname: "",
      reelsHighlighted: "",
      business: "",
      pro: "",
      isPrivate: "",
      is_verified: "",
      avatar: "",
      username: "",
      followers: "",
    },
  });
});

const upload = multer({ dest: os.tmpdir() });

router.post(
  "/perform",
  upload.single("excel"),
  async function (req, res, next) {
    try {
      if (req.file == undefined) {
        return res.status(400).send("Please upload an excel file!");
      }
      console.log(req.file.path)
      const instaData = await getAccountsFromExcel(req.file.path);
      const accountsData = instaData.map((account) => {
        return getInstaData(account);
      });

      const promisesAchieved = await Promise.all(accountsData);
      const response = promisesAchieved.map((prom) => {
        const {
          data: {
            user: {
              full_name,
              highlight_reel_count,
              is_business_account,
              is_professional_account,
              is_private,
              is_verified,
              profile_pic_url_hd,
              username,
              edge_followed_by: { count: followers },
            },
          },
        } = prom;

        return {
          fullname: full_name,
          reelsHighlighted: highlight_reel_count,
          business: is_business_account,
          pro: is_professional_account,
          isPrivate: is_private,
          is_verified: is_verified,
          avatar: profile_pic_url_hd,
          username: username,
          followers,
        };
      });
      res.render("index", {
        accounts: response.sort((a, b) => b.followers - a.followers),
      });
    } catch (err) {
      console.warn(err);
    }
  }
);

const getInstaData = async (account) => {
  const response = await fetch(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${account}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 12_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 105.0.0.11.118 (iPhone11,8; iOS 12_3_1; en_US; en-US; scale=2.00; 828x1792; 165586599)",
      },
    }
  );
  const jsonResponse = await response.json();
  return jsonResponse;
};

const getAccountsFromExcel = async (file) => {
  const accounts = await readXlsxFile(file);
  return accounts
    .map((row) => {
      return row[0].split(",");
    })
    .flat();
};

module.exports = router;
