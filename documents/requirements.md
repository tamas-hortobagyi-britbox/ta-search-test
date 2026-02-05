# Requirements of the TA test app

## Context
The goal of this space is to create a small, possible one-file HTML+JS+CSS file for a locally runnable test. The goal of the test is to test a 3rd party search API (I will provide the cURL and/or Postman collection.)
Everything is included in the one HTML file.
The focus is on testing the `TA_Test/Search` request via a web UI/

# UI requirments
1. Input fields for Enviroment configuration - see `ThinkAnalytics Stage.postman_environment.json` file for default values. Let's add them to the HTML file.
2. Testing `TA_Test/Search` request, need to have the following configurable fields:
    1. search term
    2. body (JSON)
    3. Button with text "Search", which execute the request.
3. Result needs to be shown in a grid.
    1. The result is a JSON. 
    2. If no error then a script is there in the `ThinkAnalytics.postman_collection-20206-02-05.json` Postman collection to process the result. This script need to be adapted and added.
    3. It loads the content one-by-one via another API call. All successful response have a JSON object result. I need the `result.images.tile || result.images.wallpaper` value (it is a URL to an image) - we will transform it to properly sized image. And I need the `result.title`.
4. Style is muted dark theme.

# App flow requirements
1. App loaded by the browser, it just shows the pre-populated configurable fields and search term + button.
2. When a user enters non-empty search term then can click on the button -> The `TA_Test/Search` request is executed.
3. Result is parsed. In case of error or zero result, the error is shown: the whole JSON response can be shown.
4. In case of successful result, it is parsed as the above mentiond script does. The count is shown and a small progress or counter, how many items needs to be requested to get the real data of the items. Us as many parallel calls as possible. Show the result images progressively in a grid. How images URL are parsed, defined below.
5. When all data loaded wait for another search.
6. If a new search is requested, stop the above loading process and do the new search.
7. If a new search is requested, hide any displayed error and rresult.

# Image URL parsing
1. Example received URL: `https://stag9-static.bbus-static.com/shain/v1/dataservice/ResizeImage/$value?Format='jpg'&Quality=85&ImageId='243623'&EntityType='Item'&EntityId='8958'&Width=4095&Height=2304&ImageUrl=243623`
2. Remove the `Height` query parameter and modify the `Width` parameter to 400. Like this:
`https://stag9-static.bbus-static.com/shain/v1/dataservice/ResizeImage/$value?Format=%27jpg%27&Quality=85&ImageId=%27243623%27&EntityType=%27Item%27&EntityId=%278958%27&Width=400&ImageUrl=243623`


