/// <reference path="../pb_data/types.d.ts" />

// Every collection the shop has, in one piece: what the twenty-four migrations before this one
// built, one change at a time, taken from the database they left. A fresh install makes them all
// here, in one step, before any hook or page asks for one.
//
// Imported on top of what is there, never in place of it: on a database that already has these
// collections, every field and record keeps its id, and what this leaves out stays as it was. It
// leaves out the users collection's token secrets, which have no place in a public repository; a
// fresh install makes its own.
//
// Schema changes from here on are migrations of their own, with later timestamps.
migrate(
  (app) => {
    const snapshot = [
      {
        "id": "_pb_users_auth_",
        "name": "users",
        "type": "auth",
        "system": false,
        "listRule": "id = @request.auth.id || @request.auth.admin = true",
        "viewRule": "id = @request.auth.id || @request.auth.admin = true",
        "createRule": "@request.body.admin:isset = false",
        "updateRule": "id = @request.auth.id && @request.body.admin:isset = false",
        "deleteRule": "id = @request.auth.id",
        "fields": [
          {
            "autogeneratePattern": "[a-z0-9]{15}",
            "help": "",
            "hidden": false,
            "id": "text3208210256",
            "max": 15,
            "min": 15,
            "name": "id",
            "pattern": "^[a-z0-9]+$",
            "presentable": false,
            "primaryKey": true,
            "required": true,
            "system": true,
            "type": "text"
          },
          {
            "cost": 0,
            "help": "",
            "hidden": true,
            "id": "password901924565",
            "max": 0,
            "min": 8,
            "name": "password",
            "pattern": "",
            "presentable": false,
            "required": true,
            "system": true,
            "type": "password"
          },
          {
            "autogeneratePattern": "[a-zA-Z0-9]{50}",
            "help": "",
            "hidden": true,
            "id": "text2504183744",
            "max": 60,
            "min": 30,
            "name": "tokenKey",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": true,
            "system": true,
            "type": "text"
          },
          {
            "exceptDomains": null,
            "help": "",
            "hidden": false,
            "id": "email3885137012",
            "name": "email",
            "onlyDomains": null,
            "presentable": false,
            "required": true,
            "system": true,
            "type": "email"
          },
          {
            "help": "",
            "hidden": false,
            "id": "bool1547992806",
            "name": "emailVisibility",
            "presentable": false,
            "required": false,
            "system": true,
            "type": "bool"
          },
          {
            "help": "",
            "hidden": false,
            "id": "bool256245529",
            "name": "verified",
            "presentable": false,
            "required": false,
            "system": true,
            "type": "bool"
          },
          {
            "autogeneratePattern": "",
            "help": "",
            "hidden": false,
            "id": "text1579384326",
            "max": 255,
            "min": 0,
            "name": "name",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": false,
            "system": false,
            "type": "text"
          },
          {
            "help": "",
            "hidden": false,
            "id": "file376926767",
            "maxSelect": 1,
            "maxSize": 0,
            "mimeTypes": [
              "image/jpeg",
              "image/png",
              "image/svg+xml",
              "image/gif",
              "image/webp"
            ],
            "name": "avatar",
            "presentable": false,
            "protected": false,
            "required": false,
            "system": false,
            "thumbs": null,
            "type": "file"
          },
          {
            "hidden": false,
            "id": "autodate2990389176",
            "name": "created",
            "onCreate": true,
            "onUpdate": false,
            "presentable": false,
            "system": false,
            "type": "autodate"
          },
          {
            "hidden": false,
            "id": "autodate3332085495",
            "name": "updated",
            "onCreate": true,
            "onUpdate": true,
            "presentable": false,
            "system": false,
            "type": "autodate"
          },
          {
            "help": "",
            "hidden": false,
            "id": "bool2282622326",
            "name": "admin",
            "presentable": false,
            "required": false,
            "system": false,
            "type": "bool"
          }
        ],
        "indexes": [
          "CREATE UNIQUE INDEX `idx_tokenKey__pb_users_auth_` ON `users` (`tokenKey`)",
          "CREATE UNIQUE INDEX `idx_email__pb_users_auth_` ON `users` (`email`) WHERE `email` != ''"
        ],
        "authRule": "",
        "manageRule": null,
        "authAlert": {
          "enabled": true,
          "emailTemplate": {
            "subject": "Login from a new location",
            "body": "<p>Hello,</p>\n<p>We noticed a login to your {APP_NAME} account from a new location:</p>\n<p><em>{ALERT_INFO}</em></p>\n<p><strong>If this wasn't you, you should immediately change your {APP_NAME} account password to revoke access from all other locations.</strong></p>\n<p>If this was you, you may disregard this email.</p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>"
          }
        },
        "oauth2": {
          "providers": [],
          "mappedFields": {
            "id": "",
            "name": "name",
            "username": "",
            "avatarURL": "avatar"
          },
          "enabled": false
        },
        "passwordAuth": {
          "enabled": true,
          "identityFields": [
            "email"
          ]
        },
        "mfa": {
          "enabled": false,
          "duration": 600,
          "rule": ""
        },
        "otp": {
          "enabled": false,
          "duration": 180,
          "length": 8,
          "emailTemplate": {
            "subject": "OTP for {APP_NAME}",
            "body": "<p>Hello,</p>\n<p>Your one-time password is: <strong>{OTP}</strong></p>\n<p><i>If you didn't ask for the one-time password, you can ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>"
          }
        },
        "authToken": {
          "duration": 432000
        },
        "passwordResetToken": {
          "duration": 86400
        },
        "emailChangeToken": {
          "duration": 1800
        },
        "verificationToken": {
          "duration": 86400
        },
        "fileToken": {
          "duration": 180
        },
        "verificationTemplate": {
          "subject": "Verify your {APP_NAME} email",
          "body": "<p>Hello,</p>\n<p>Thank you for joining us at {APP_NAME}.</p>\n<p>Click on the button below to verify your email address.</p>\n<p>\n  <a class=\"btn\" href=\"{APP_URL}/verify/{TOKEN}\" target=\"_blank\" rel=\"noopener\">Verify</a>\n</p>\n<p><i>If you didn't recently register, please ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>"
        },
        "resetPasswordTemplate": {
          "subject": "Reset your {APP_NAME} password",
          "body": "<p>Hello,</p>\n<p>Click on the button below to reset your password.</p>\n<p>\n  <a class=\"btn\" href=\"{APP_URL}/reset-password/{TOKEN}\" target=\"_blank\" rel=\"noopener\">Reset password</a>\n</p>\n<p><i>If you didn't ask to reset your password, please ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>"
        },
        "confirmEmailChangeTemplate": {
          "subject": "Confirm your {APP_NAME} new email address",
          "body": "<p>Hello,</p>\n<p>Click on the button below to confirm your new email address.</p>\n<p>\n  <a class=\"btn\" href=\"{APP_URL}/confirm-email/{TOKEN}\" target=\"_blank\" rel=\"noopener\">Confirm new email</a>\n</p>\n<p><i>If you didn't ask to change your email address, please ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>"
        }
      },
      {
        "id": "pbc_4092854851",
        "name": "products",
        "type": "base",
        "system": false,
        "listRule": "hidden = false || @request.auth.admin = true",
        "viewRule": "hidden = false || @request.auth.admin = true",
        "createRule": null,
        "updateRule": null,
        "deleteRule": null,
        "fields": [
          {
            "autogeneratePattern": "[a-z0-9]{15}",
            "help": "",
            "hidden": false,
            "id": "text3208210256",
            "max": 15,
            "min": 15,
            "name": "id",
            "pattern": "^[a-z0-9]+$",
            "presentable": false,
            "primaryKey": true,
            "required": true,
            "system": true,
            "type": "text"
          },
          {
            "autogeneratePattern": "",
            "help": "",
            "hidden": false,
            "id": "text2441093337",
            "max": 0,
            "min": 0,
            "name": "handle",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": true,
            "system": false,
            "type": "text"
          },
          {
            "autogeneratePattern": "",
            "help": "",
            "hidden": false,
            "id": "text724990059",
            "max": 0,
            "min": 0,
            "name": "title",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": true,
            "system": false,
            "type": "text"
          },
          {
            "autogeneratePattern": "",
            "help": "",
            "hidden": false,
            "id": "text475199832",
            "max": 0,
            "min": 0,
            "name": "brand",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": false,
            "system": false,
            "type": "text"
          },
          {
            "autogeneratePattern": "",
            "help": "",
            "hidden": false,
            "id": "text105650625",
            "max": 0,
            "min": 0,
            "name": "category",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": true,
            "system": false,
            "type": "text"
          },
          {
            "help": "",
            "hidden": false,
            "id": "number4288122767",
            "max": null,
            "min": null,
            "name": "price_cents",
            "onlyInt": true,
            "presentable": false,
            "required": true,
            "system": false,
            "type": "number"
          },
          {
            "help": "",
            "hidden": false,
            "id": "number893727452",
            "max": null,
            "min": null,
            "name": "regular_price_cents",
            "onlyInt": true,
            "presentable": false,
            "required": false,
            "system": false,
            "type": "number"
          },
          {
            "autogeneratePattern": "",
            "help": "",
            "hidden": false,
            "id": "text1767278655",
            "max": 0,
            "min": 0,
            "name": "currency",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": true,
            "system": false,
            "type": "text"
          },
          {
            "help": "",
            "hidden": false,
            "id": "number1261852256",
            "max": null,
            "min": null,
            "name": "stock",
            "onlyInt": true,
            "presentable": false,
            "required": false,
            "system": false,
            "type": "number"
          },
          {
            "help": "",
            "hidden": false,
            "id": "number3632866850",
            "max": null,
            "min": null,
            "name": "rating",
            "onlyInt": false,
            "presentable": false,
            "required": false,
            "system": false,
            "type": "number"
          },
          {
            "help": "",
            "hidden": false,
            "id": "json1874629670",
            "maxSize": 2000,
            "name": "tags",
            "presentable": false,
            "required": false,
            "system": false,
            "type": "json"
          },
          {
            "autogeneratePattern": "",
            "help": "",
            "hidden": false,
            "id": "text3309110367",
            "max": 0,
            "min": 0,
            "name": "image",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": false,
            "system": false,
            "type": "text"
          },
          {
            "hidden": false,
            "id": "autodate2990389176",
            "name": "created",
            "onCreate": true,
            "onUpdate": false,
            "presentable": false,
            "system": false,
            "type": "autodate"
          },
          {
            "hidden": false,
            "id": "autodate3332085495",
            "name": "updated",
            "onCreate": true,
            "onUpdate": true,
            "presentable": false,
            "system": false,
            "type": "autodate"
          },
          {
            "help": "",
            "hidden": false,
            "id": "number2563956121",
            "max": null,
            "min": null,
            "name": "sold",
            "onlyInt": true,
            "presentable": false,
            "required": false,
            "system": false,
            "type": "number"
          },
          {
            "autogeneratePattern": "",
            "help": "",
            "hidden": false,
            "id": "text1843675174",
            "max": 0,
            "min": 0,
            "name": "description",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": false,
            "system": false,
            "type": "text"
          },
          {
            "help": "",
            "hidden": false,
            "id": "json3760176746",
            "maxSize": 10000,
            "name": "images",
            "presentable": false,
            "required": false,
            "system": false,
            "type": "json"
          },
          {
            "help": "",
            "hidden": false,
            "id": "number130897217",
            "max": null,
            "min": null,
            "name": "weight",
            "onlyInt": true,
            "presentable": false,
            "required": true,
            "system": false,
            "type": "number"
          },
          {
            "help": "",
            "hidden": false,
            "id": "bool2287856061",
            "name": "hidden",
            "presentable": false,
            "required": false,
            "system": false,
            "type": "bool"
          }
        ],
        "indexes": [
          "CREATE UNIQUE INDEX `idx_products_handle` ON `products` (`handle`)",
          "CREATE INDEX `idx_products_category` ON `products` (`category`)"
        ]
      },
      {
        "id": "pbc_3527180448",
        "name": "orders",
        "type": "base",
        "system": false,
        "listRule": "@request.auth.id != \"\" && (user = @request.auth.id || @request.auth.admin = true)",
        "viewRule": "@request.auth.id != \"\" && (user = @request.auth.id || @request.auth.admin = true)",
        "createRule": null,
        "updateRule": null,
        "deleteRule": null,
        "fields": [
          {
            "autogeneratePattern": "[a-z0-9]{15}",
            "help": "",
            "hidden": false,
            "id": "text3208210256",
            "max": 15,
            "min": 15,
            "name": "id",
            "pattern": "^[a-z0-9]+$",
            "presentable": false,
            "primaryKey": true,
            "required": true,
            "system": true,
            "type": "text"
          },
          {
            "autogeneratePattern": "",
            "help": "",
            "hidden": false,
            "id": "text2929936659",
            "max": 0,
            "min": 0,
            "name": "reference",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": true,
            "system": false,
            "type": "text"
          },
          {
            "cascadeDelete": false,
            "collectionId": "_pb_users_auth_",
            "help": "",
            "hidden": false,
            "id": "relation2375276105",
            "maxSelect": 1,
            "minSelect": 0,
            "name": "user",
            "presentable": false,
            "required": false,
            "system": false,
            "type": "relation"
          },
          {
            "autogeneratePattern": "",
            "help": "",
            "hidden": false,
            "id": "text1579384326",
            "max": 0,
            "min": 0,
            "name": "name",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": true,
            "system": false,
            "type": "text"
          },
          {
            "exceptDomains": null,
            "help": "",
            "hidden": false,
            "id": "email3885137012",
            "name": "email",
            "onlyDomains": null,
            "presentable": false,
            "required": true,
            "system": false,
            "type": "email"
          },
          {
            "autogeneratePattern": "",
            "help": "",
            "hidden": false,
            "id": "text1146066909",
            "max": 0,
            "min": 0,
            "name": "phone",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": true,
            "system": false,
            "type": "text"
          },
          {
            "autogeneratePattern": "",
            "help": "",
            "hidden": false,
            "id": "text223244161",
            "max": 0,
            "min": 0,
            "name": "address",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": true,
            "system": false,
            "type": "text"
          },
          {
            "help": "",
            "hidden": false,
            "id": "json1325501590",
            "maxSize": 20000,
            "name": "lines",
            "presentable": false,
            "required": true,
            "system": false,
            "type": "json"
          },
          {
            "autogeneratePattern": "",
            "help": "",
            "hidden": false,
            "id": "text1767278655",
            "max": 0,
            "min": 0,
            "name": "currency",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": true,
            "system": false,
            "type": "text"
          },
          {
            "help": "",
            "hidden": false,
            "id": "number3097235076",
            "max": null,
            "min": null,
            "name": "subtotal",
            "onlyInt": true,
            "presentable": false,
            "required": true,
            "system": false,
            "type": "number"
          },
          {
            "help": "",
            "hidden": false,
            "id": "number756815652",
            "max": null,
            "min": null,
            "name": "shipping",
            "onlyInt": true,
            "presentable": false,
            "required": false,
            "system": false,
            "type": "number"
          },
          {
            "help": "",
            "hidden": false,
            "id": "number3257917790",
            "max": null,
            "min": null,
            "name": "total",
            "onlyInt": true,
            "presentable": false,
            "required": true,
            "system": false,
            "type": "number"
          },
          {
            "help": "",
            "hidden": false,
            "id": "select1831371789",
            "maxSelect": 1,
            "name": "payment",
            "presentable": false,
            "required": true,
            "system": false,
            "type": "select",
            "values": [
              "card",
              "cod"
            ]
          },
          {
            "help": "",
            "hidden": false,
            "id": "bool4253985592",
            "name": "paid",
            "presentable": false,
            "required": false,
            "system": false,
            "type": "bool"
          },
          {
            "help": "",
            "hidden": false,
            "id": "select2063623452",
            "maxSelect": 1,
            "name": "status",
            "presentable": false,
            "required": true,
            "system": false,
            "type": "select",
            "values": [
              "pending",
              "shipped",
              "delivered",
              "returned",
              "cancelled"
            ]
          },
          {
            "hidden": false,
            "id": "autodate2990389176",
            "name": "created",
            "onCreate": true,
            "onUpdate": false,
            "presentable": false,
            "system": false,
            "type": "autodate"
          },
          {
            "hidden": false,
            "id": "autodate3332085495",
            "name": "updated",
            "onCreate": true,
            "onUpdate": true,
            "presentable": false,
            "system": false,
            "type": "autodate"
          }
        ],
        "indexes": [
          "CREATE UNIQUE INDEX `idx_orders_reference` ON `orders` (`reference`)",
          "CREATE INDEX `idx_orders_user` ON `orders` (`user`)",
          "CREATE INDEX `idx_orders_status` ON `orders` (status)",
          "CREATE INDEX `idx_orders_created` ON `orders` (created)"
        ]
      },
      {
        "id": "pbc_2923026773",
        "name": "faqs",
        "type": "base",
        "system": false,
        "listRule": "active = true",
        "viewRule": "active = true",
        "createRule": null,
        "updateRule": null,
        "deleteRule": null,
        "fields": [
          {
            "autogeneratePattern": "[a-z0-9]{15}",
            "help": "",
            "hidden": false,
            "id": "text3208210256",
            "max": 15,
            "min": 15,
            "name": "id",
            "pattern": "^[a-z0-9]+$",
            "presentable": false,
            "primaryKey": true,
            "required": true,
            "system": true,
            "type": "text"
          },
          {
            "autogeneratePattern": "",
            "help": "",
            "hidden": false,
            "id": "text3069659470",
            "max": 200,
            "min": 0,
            "name": "question",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": true,
            "system": false,
            "type": "text"
          },
          {
            "autogeneratePattern": "",
            "help": "",
            "hidden": false,
            "id": "text3671935525",
            "max": 2000,
            "min": 0,
            "name": "answer",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": true,
            "system": false,
            "type": "text"
          },
          {
            "help": "",
            "hidden": false,
            "id": "number1177347317",
            "max": null,
            "min": null,
            "name": "position",
            "onlyInt": true,
            "presentable": false,
            "required": false,
            "system": false,
            "type": "number"
          },
          {
            "help": "",
            "hidden": false,
            "id": "bool1260321794",
            "name": "active",
            "presentable": false,
            "required": false,
            "system": false,
            "type": "bool"
          },
          {
            "hidden": false,
            "id": "autodate2990389176",
            "name": "created",
            "onCreate": true,
            "onUpdate": false,
            "presentable": false,
            "system": false,
            "type": "autodate"
          },
          {
            "hidden": false,
            "id": "autodate3332085495",
            "name": "updated",
            "onCreate": true,
            "onUpdate": true,
            "presentable": false,
            "system": false,
            "type": "autodate"
          }
        ],
        "indexes": []
      },
      {
        "id": "pbc_4275913271",
        "name": "threads",
        "type": "base",
        "system": false,
        "listRule": "@request.auth.id != \"\" && (user = @request.auth.id || @request.auth.admin = true)",
        "viewRule": "@request.auth.id != \"\" && (user = @request.auth.id || @request.auth.admin = true)",
        "createRule": null,
        "updateRule": null,
        "deleteRule": null,
        "fields": [
          {
            "autogeneratePattern": "[a-z0-9]{15}",
            "help": "",
            "hidden": false,
            "id": "text3208210256",
            "max": 15,
            "min": 15,
            "name": "id",
            "pattern": "^[a-z0-9]+$",
            "presentable": false,
            "primaryKey": true,
            "required": true,
            "system": true,
            "type": "text"
          },
          {
            "cascadeDelete": false,
            "collectionId": "pbc_4092854851",
            "help": "",
            "hidden": false,
            "id": "relation3544843437",
            "maxSelect": 1,
            "minSelect": 0,
            "name": "product",
            "presentable": false,
            "required": false,
            "system": false,
            "type": "relation"
          },
          {
            "autogeneratePattern": "",
            "help": "",
            "hidden": false,
            "id": "text4224597626",
            "max": 0,
            "min": 0,
            "name": "subject",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": true,
            "system": false,
            "type": "text"
          },
          {
            "autogeneratePattern": "",
            "help": "",
            "hidden": false,
            "id": "text3404063135",
            "max": 0,
            "min": 0,
            "name": "visitor",
            "pattern": "^[0-9a-f-]{36}$",
            "presentable": false,
            "primaryKey": false,
            "required": true,
            "system": false,
            "type": "text"
          },
          {
            "cascadeDelete": false,
            "collectionId": "_pb_users_auth_",
            "help": "",
            "hidden": false,
            "id": "relation2375276105",
            "maxSelect": 1,
            "minSelect": 0,
            "name": "user",
            "presentable": false,
            "required": false,
            "system": false,
            "type": "relation"
          },
          {
            "help": "",
            "hidden": false,
            "id": "date3492875319",
            "max": "",
            "min": "",
            "name": "last_message",
            "presentable": false,
            "required": false,
            "system": false,
            "type": "date"
          },
          {
            "hidden": false,
            "id": "autodate2990389176",
            "name": "created",
            "onCreate": true,
            "onUpdate": false,
            "presentable": false,
            "system": false,
            "type": "autodate"
          },
          {
            "hidden": false,
            "id": "autodate3332085495",
            "name": "updated",
            "onCreate": true,
            "onUpdate": true,
            "presentable": false,
            "system": false,
            "type": "autodate"
          },
          {
            "help": "",
            "hidden": false,
            "id": "bool1759153582",
            "name": "waiting",
            "presentable": false,
            "required": false,
            "system": false,
            "type": "bool"
          },
          {
            "autogeneratePattern": "",
            "help": "",
            "hidden": false,
            "id": "text3112513328",
            "max": 200,
            "min": 0,
            "name": "preview",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": false,
            "system": false,
            "type": "text"
          },
          {
            "help": "",
            "hidden": true,
            "id": "date1543799227",
            "max": "",
            "min": "",
            "name": "reply_unseen_since",
            "presentable": false,
            "required": false,
            "system": false,
            "type": "date"
          },
          {
            "help": "",
            "hidden": true,
            "id": "bool4248171940",
            "name": "reply_mailed",
            "presentable": false,
            "required": false,
            "system": false,
            "type": "bool"
          }
        ],
        "indexes": [
          "CREATE INDEX `idx_threads_visitor` ON `threads` (`visitor`)",
          "CREATE INDEX `idx_threads_user` ON `threads` (`user`)",
          "CREATE INDEX `idx_threads_last_message` ON `threads` (last_message)",
          "CREATE INDEX `idx_threads_reply_unseen_since` ON `threads` (reply_unseen_since)"
        ]
      },
      {
        "id": "pbc_2605467279",
        "name": "messages",
        "type": "base",
        "system": false,
        "listRule": "@request.auth.id != \"\" && (thread.user = @request.auth.id || @request.auth.admin = true)",
        "viewRule": "@request.auth.id != \"\" && (thread.user = @request.auth.id || @request.auth.admin = true)",
        "createRule": null,
        "updateRule": null,
        "deleteRule": null,
        "fields": [
          {
            "autogeneratePattern": "[a-z0-9]{15}",
            "help": "",
            "hidden": false,
            "id": "text3208210256",
            "max": 15,
            "min": 15,
            "name": "id",
            "pattern": "^[a-z0-9]+$",
            "presentable": false,
            "primaryKey": true,
            "required": true,
            "system": true,
            "type": "text"
          },
          {
            "cascadeDelete": true,
            "collectionId": "pbc_4275913271",
            "help": "",
            "hidden": false,
            "id": "relation824200323",
            "maxSelect": 1,
            "minSelect": 0,
            "name": "thread",
            "presentable": false,
            "required": true,
            "system": false,
            "type": "relation"
          },
          {
            "help": "",
            "hidden": false,
            "id": "select3182418120",
            "maxSelect": 1,
            "name": "author",
            "presentable": false,
            "required": true,
            "system": false,
            "type": "select",
            "values": [
              "visitor",
              "shop"
            ]
          },
          {
            "autogeneratePattern": "",
            "help": "",
            "hidden": false,
            "id": "text3404063135",
            "max": 0,
            "min": 0,
            "name": "visitor",
            "pattern": "^[0-9a-f-]{36}$",
            "presentable": false,
            "primaryKey": false,
            "required": false,
            "system": false,
            "type": "text"
          },
          {
            "cascadeDelete": false,
            "collectionId": "pbc_2923026773",
            "help": "",
            "hidden": false,
            "id": "relation3909055948",
            "maxSelect": 1,
            "minSelect": 0,
            "name": "faq",
            "presentable": false,
            "required": false,
            "system": false,
            "type": "relation"
          },
          {
            "autogeneratePattern": "",
            "help": "",
            "hidden": false,
            "id": "text3685223346",
            "max": 2000,
            "min": 0,
            "name": "body",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": true,
            "system": false,
            "type": "text"
          },
          {
            "hidden": false,
            "id": "autodate2990389176",
            "name": "created",
            "onCreate": true,
            "onUpdate": false,
            "presentable": false,
            "system": false,
            "type": "autodate"
          }
        ],
        "indexes": [
          "CREATE INDEX `idx_messages_thread` ON `messages` (`thread`)",
          "CREATE INDEX `idx_messages_visitor` ON `messages` (`visitor`)"
        ]
      },
      {
        "id": "pbc_3620300578",
        "name": "shop_settings",
        "type": "base",
        "system": false,
        "listRule": null,
        "viewRule": null,
        "createRule": null,
        "updateRule": null,
        "deleteRule": null,
        "fields": [
          {
            "autogeneratePattern": "[a-z0-9]{15}",
            "help": "",
            "hidden": false,
            "id": "text3208210256",
            "max": 15,
            "min": 15,
            "name": "id",
            "pattern": "^[a-z0-9]+$",
            "presentable": false,
            "primaryKey": true,
            "required": true,
            "system": true,
            "type": "text"
          },
          {
            "autogeneratePattern": "",
            "help": "From @BotFather, like 1234567890:AAH…. It is the bot's password: it goes here and nowhere else.",
            "hidden": false,
            "id": "text1123852921",
            "max": 0,
            "min": 0,
            "name": "telegram_token",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": false,
            "system": false,
            "type": "text"
          },
          {
            "autogeneratePattern": "",
            "help": "Press Start in a chat with the bot, then open api.telegram.org/bot<token>/getUpdates: the number after \"chat\":{\"id\":",
            "hidden": false,
            "id": "text1104941267",
            "max": 0,
            "min": 0,
            "name": "telegram_chat_id",
            "pattern": "",
            "presentable": false,
            "primaryKey": false,
            "required": false,
            "system": false,
            "type": "text"
          },
          {
            "hidden": false,
            "id": "autodate2990389176",
            "name": "created",
            "onCreate": true,
            "onUpdate": false,
            "presentable": false,
            "system": false,
            "type": "autodate"
          },
          {
            "hidden": false,
            "id": "autodate3332085495",
            "name": "updated",
            "onCreate": true,
            "onUpdate": true,
            "presentable": false,
            "system": false,
            "type": "autodate"
          },
          {
            "help": "Mail the shop's own address when a chat question starts waiting for an answer.",
            "hidden": false,
            "id": "bool4060498614",
            "name": "mail_questions",
            "presentable": false,
            "required": false,
            "system": false,
            "type": "bool"
          },
          {
            "help": "Mail the shop's own address a copy of every new order. The buyer's confirmation goes either way.",
            "hidden": false,
            "id": "bool940982917",
            "name": "mail_orders",
            "presentable": false,
            "required": false,
            "system": false,
            "type": "bool"
          },
          {
            "help": "A Telegram message when a chat question starts waiting for an answer.",
            "hidden": false,
            "id": "bool4069464166",
            "name": "telegram_questions",
            "presentable": false,
            "required": false,
            "system": false,
            "type": "bool"
          },
          {
            "help": "A Telegram message for every new order.",
            "hidden": false,
            "id": "bool2111837777",
            "name": "telegram_orders",
            "presentable": false,
            "required": false,
            "system": false,
            "type": "bool"
          },
          {
            "help": "The shop's language: its pages, mails, messages and Telegram. Also set in the admin area, under Settings.",
            "hidden": false,
            "id": "select3571151285",
            "maxSelect": 1,
            "name": "language",
            "presentable": false,
            "required": true,
            "system": false,
            "type": "select",
            "values": [
              "en",
              "sr-Latn"
            ]
          },
          {
            "help": "The colour of buttons, links, the cart count and focus; none is ink. Also set in the admin area, under Settings.",
            "hidden": false,
            "id": "select1734464235",
            "maxSelect": 1,
            "name": "accent",
            "presentable": false,
            "required": true,
            "system": false,
            "type": "select",
            "values": [
              "none",
              "violet",
              "indigo",
              "teal",
              "orange",
              "lime"
            ]
          }
        ],
        "indexes": []
      }
    ];

    app.importCollections(snapshot, false);
  },
  (app) => {
    // Nothing to undo that would not take every record with it.
  },
);
