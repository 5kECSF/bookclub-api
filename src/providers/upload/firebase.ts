import admin from 'firebase-admin';
import { EnvVar } from '../../common/config/config.instances';
import { FAIL, Resp, Succeed } from '../../common/constants/response.const';
import { ColorEnums, logTrace } from '../../common/logger';
import { ImageObj } from '../../app/file/file.dto';
import { Injectable } from '@nestjs/common';

const fbConfig = {
  type: EnvVar.getInstance.FIREBASE_TYPE,
  project_id: EnvVar.getInstance.FIREBASE_PROJECT_ID,
  private_key: EnvVar.getInstance.FIREBASE_PRIVATE_KEY_STRING,
  private_key_id: EnvVar.getInstance.FIREBASE_PRIVATE_KEY_ID,
  client_email: EnvVar.getInstance.FIREBASE_CLIENT_EMAIL,
  client_id: EnvVar.getInstance.FIREBASE_CLIENT_ID,
  auth_uri: EnvVar.getInstance.FIREBASE_AUTH_URI,
  token_uri: EnvVar.getInstance.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: EnvVar.getInstance.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: EnvVar.getInstance.FIREBASE_CLIENT_X509_CERT_URL,
};

const FirebaseProjectName = EnvVar.getInstance.FIREBASE_PROJECT_NAME;

admin.initializeApp({
  // credential: admin.credential.cert(serviceAccount),
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  credential: admin.credential.cert(fbConfig),
  databaseURL: `https://${FirebaseProjectName}.firebaseio.com`,
  storageBucket: `gs://${FirebaseProjectName}.appspot.com`,
});

const storageRef = admin.storage().bucket(`gs://${FirebaseProjectName}.appspot.com`);

const projName = `${FirebaseProjectName}.appspot.com`;
const toBeRemoved = `https://storage.googleapis.com/${projName}/`;
const ToBeAdded = `https://firebasestorage.googleapis.com/v0/b/${projName}/o/`;

@Injectable()
export class FirebaseService implements FileServiceInterface {
  //gets a file name & a buffer file, and uploads the file to firebase -> returns an object{imageCover:{img:"name", suffix:""},imagePath:"" }
  async UploadOne(fName: string, file: Buffer): Promise<Resp<ImageObj>> {
    try {
      const fFile = await storageRef.file(fName);
      await fFile.save(file, { contentType: 'image/jpeg' });
      const publicUrl = fFile.publicUrl();

      //replacing the name of the public url so that it can be previewed by browser
      publicUrl.replace(`${toBeRemoved}`, '');
      // log_func("public url is", publicUrl, "BgMagenta", 2)
      return Succeed({
        imageName: fName,
        suffix: '?alt=media',
        imagePath: ToBeAdded,
        image: ToBeAdded + fName + '?alt=media',
      });
    } catch (e) {
      return FAIL('uploading to firebase failed', e.code);
    }
  }

  async deleteImageById(id): Promise<Resp<boolean>> {
    try {
      const res = await storageRef.deleteFiles({ prefix: id });
      logTrace('successfully deleted an image', res, ColorEnums.BgGreen);
      return Succeed(true);
    } catch (e) {
      return FAIL('failed to delete firebase image');
    }
  }

  async firebaseVerifyToken(idToken: string): Promise<Resp<any>> {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      // firebaseId = decodedToken.uid
      console.log('decTOkn=>', decodedToken);
      return Succeed(decodedToken);
    } catch (e) {
      return FAIL(e.message);
    }
  }
}

export interface FileServiceInterface {
  firebaseVerifyToken(token: string): Promise<Resp<any>>;

  deleteImageById(id: string): Promise<Resp<boolean>>;

  UploadOne(fName: string, file: Buffer): Promise<Resp<ImageObj>>;
}

@Injectable()
export class MockFile implements FileServiceInterface {
  UploadOne(fName: string, file: Buffer): Promise<Resp<ImageObj>> {
    return Promise.resolve(undefined);
  }

  deleteImageById(id: string): Promise<Resp<boolean>> {
    return Promise.resolve(undefined);
  }

  firebaseVerifyToken(token: string): Promise<Resp<any>> {
    return Promise.resolve(undefined);
  }
}
