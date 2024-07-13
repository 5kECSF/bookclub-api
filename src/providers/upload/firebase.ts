import admin from 'firebase-admin';
import { EnvVar } from '../../common/config/config.instances';
import { FAIL, Resp, Succeed } from '../../common/constants/return.consts';
import { ColorEnums, logTrace } from '../../common/logger';
import { Injectable } from '@nestjs/common';
import { UploadDto } from '@/app/upload/upload.entity';

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
export const ToBeAdded = `https://firebasestorage.googleapis.com/v0/b/${projName}/o/`;

@Injectable()
export class FirebaseService implements FileServiceInterface {
  //gets a upload name & a buffer upload, and uploads the upload to firebase -> returns an object{imageCover:{img:"name", suffix:""},imagePath:"" }
  async UploadOne(fName: string, file: Buffer): Promise<Resp<UploadDto>> {
    try {
      const fFile = storageRef.file(fName);
      await fFile.save(file, { contentType: 'image/jpeg' });

      // const parts = fName.split('/');
      //URL-encoded representation of forward slash /
      // const resultString = parts.join('%2F');

      // log_func("public url is", publicUrl, "BgMagenta", 2)
      logTrace('upload succeed', fName);
      return Succeed({
        url: ToBeAdded + fName + '?alt=media',
        suffix: '?alt=media',
        pathId: 'p1',
        fileName: fName,
      });
    } catch (e) {
      return FAIL('uploading to firebase failed', e.code);
    }
  }

  async deleteImageByPrefix(id): Promise<Resp<boolean>> {
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

  deleteImageByPrefix(id: string): Promise<Resp<boolean>>;

  UploadOne(fName: string, file: Buffer): Promise<Resp<UploadDto>>;
}

@Injectable()
export class MockFile implements FileServiceInterface {
  UploadOne(fName: string, file: Buffer): Promise<Resp<UploadDto>> {
    return Promise.resolve(undefined);
  }

  deleteImageByPrefix(id: string): Promise<Resp<boolean>> {
    return Promise.resolve(undefined);
  }

  firebaseVerifyToken(token: string): Promise<Resp<any>> {
    return Promise.resolve(undefined);
  }
}
