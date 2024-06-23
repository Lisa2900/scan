import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonText,
} from '@ionic/react';
import { isPlatform } from '@ionic/react';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { ref, set, getDatabase } from 'firebase/database';
import { app } from '../firebase'; // Importa la instancia de Firebase Realtime Database desde tu archivo firebase.tsx

const Home: React.FC = () => {
  const db = getDatabase(app);
  const [scannedData, setScannedData] = useState<string>('');

  useEffect(() => {
    const requestPermissions = async () => {
      if (isPlatform('android') || isPlatform('ios')) {
        await BarcodeScanner.requestPermissions();
      }
    };
    requestPermissions();
  }, []);

  const scanBarcodeNative = async () => {
    try {
      const { barcodes } = await BarcodeScanner.scan({
        formats: [BarcodeFormat.QrCode, BarcodeFormat.Code128, BarcodeFormat.Ean13],
      });
      if (barcodes.length > 0) {
        const scannedValue = barcodes[0].rawValue || 'No data found';
        setScannedData(scannedValue);
        // Envía el valor escaneado a Firebase Realtime Database
        sendToRealtimeDatabase(scannedValue);
      } else {
        setScannedData('No barcodes found');
      }
    } catch (error) {
      console.error(error);
      setScannedData('Error scanning barcode');
    }
  };

  const sendToRealtimeDatabase = (data: string) => {
    const databaseRef = ref(db, 'codigo'); // Actualiza el registro 'codigo'
    set(databaseRef, {
      value: data,
      timestamp: new Date().toISOString(),
    });
  };

  const scanBarcode = () => {
    if (isPlatform('android') || isPlatform('ios')) {
      scanBarcodeNative();
    } else {
      setScannedData('Web scanning not supported in this version.');
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Barcode Scanner</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonButton onClick={scanBarcode}>Scan Barcode</IonButton>
        {scannedData && (
          <IonText>
            <p>Scanned Data: {scannedData}</p>
          </IonText>
        )}
        <div id="reader"></div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
