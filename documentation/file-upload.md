
# this explains how file upload works

## for uploading images for models that have single image

-> first we upload the image using the file/single endpoint, which returns the image object
-> then we send the id of that file with the object & 
-> the object will find the image and connect it with the parent object

## Upload issues

- what if the image is uploaded and the creation of the file failed
  - the images status will be not assigned in the database

## file Related tasks

- [] file upload tasks
  - [x] upload single file
  - [x] update single file
  - [x] delete single file
    - ---
  - [x] upload multiple file
  - [x] update multiple file
  - [] delete multiple file
