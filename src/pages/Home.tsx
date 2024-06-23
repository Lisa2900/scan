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
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const Home: React.FC = () => {
  const db = getDatabase(app);
  const firestore = getFirestore(app);
  const [scannedData, setScannedData] = useState<string>('');
  const [productDetails, setProductDetails] = useState<any>(null);

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
        // Busca el producto en Firestore
        fetchProductDetails(scannedValue);
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

  const fetchProductDetails = async (codigo: string) => {
    const q = query(collection(firestore, 'inventario'), where('codigo', '==', codigo));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const productData = querySnapshot.docs[0].data();
      setProductDetails(productData);
    } else {
      setProductDetails(null);
    }
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
        {productDetails ? (
          <IonText>
            <p>Nombre: {productDetails.nombre}</p>
            <p>Categoría: {productDetails.categoria}</p>
            <p>Código: {productDetails.codigo}</p>
            <p>Precio: {productDetails.precio}</p>
            <p>Cantidad: {productDetails.cantidad}</p>
          </IonText>
        ) : (
          scannedData && (
            <IonText>
              <p>No se encontraron detalles del producto para este código.</p>
            </IonText>
          )
        )}
      </IonContent>
    </IonPage>
  );
};

export default Home;
