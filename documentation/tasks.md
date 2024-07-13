features for this that are finished & to be done

> Finished Tasks

- makeing e2e tests work
- make integration test manager
- create default user & admin inside integration test manager

> tasks to do
>

- [x] generes api
- [x] categories api
- [x] books api
- [x] document the code using ts docs
- [] borrow request
    - [x] request borrow
    - [x] cancel request to borrow
    - [] cancel accepted request
    - [] Admin accept borrow
        - [x] update borrow model { status, uid, instanceId, instance No}
        - [x] update donation model {status, borrower Id , borrower Name}
        - [x] update book instance and book count
        - [x] send notification to user with message {book Name, userId}
        - [] send Email Notification

    - [] Admin mark book Taken
        - [x] update borrow model {taken date, duedate, note, status}
        - [x] update book Instance {status}
        - [x] send Notification To the User

    - [] admin mark returned
    -
    - [] admin revert mark returned
    - [] admin Revert accept borrow
    - [] admin revert mark taken


---

- [] file upload tasks
  - [x] upload single file
  - [x] update single file
  - [x] delete single file
  - [x] upload multiple file
  - [x] update multiple file
  - [x] delete multiple file

    

## integration tasks


- [] integrate category api
- [] integrate book api
- 