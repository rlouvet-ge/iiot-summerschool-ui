# ge-app

## App setup

First you need to create the required CloudFoundry user-provided-services in your Predix space
```
cf cups utum_uaa_admin -p ups_credentials/utum_uaa_admin.json
cf cups utum_timeseries -p ups_credentials/utum_timeseries.json
```

Then you need to provide credentials in your manifest.yml file
```
clientId: timeseries_client_readonly
clientSecret: secret
```

Install npm and bower dependencies 
```
npm install && bower install
```

To customize the application name do a global search and
replace of `ge__app` and `app__title`.

`ge__app` is the name used in `package.json`, `bower.json` and
other internal files.

`app__title` is the name used in user-facing files like `public/_index.html`.