import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonInput,
  IonText,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import { isPlatform } from '@ionic/react';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { ref, set, getDatabase } from 'firebase/database';
import { app } from '../firebase'; // Importa la instancia de Firebase Realtime Database desde tu archivo firebase.tsx
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import './Home.css'; // Importa tu archivo de estilos personalizados

const Home: React.FC = () => {
  const db = getDatabase(app);
  const firestore = getFirestore(app);
  const [scannedData, setScannedData] = useState<string>('');
  const [productDetails, setProductDetails] = useState<any>(null);
  const [manualCode, setManualCode] = useState<string>('');

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

  const handleManualCodeInput = () => {
    if (manualCode) {
      setScannedData(manualCode);
      sendToRealtimeDatabase(manualCode);
      fetchProductDetails(manualCode);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Scanner peque</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonGrid>
          <IonRow className="ion-justify-content-center">
            <IonCol size="12" size-md="8" size-lg="6">
              <IonButton expand="full" onClick={scanBarcode}>Escanear con Camara </IonButton>
              <IonInput
                className="ion-margin-top"
                value={manualCode}
                placeholder="Ingresar codigo Manual"
                onIonChange={e => setManualCode(e.detail.value!)}
                clearInput
              />
              <IonButton expand="full" className="ion-margin-top" onClick={handleManualCodeInput}>
                Buscar
              </IonButton>
            </IonCol>
          </IonRow>
          {scannedData && (
            <IonRow className="ion-justify-content-center ion-margin-top">
              <IonCol size="12" size-md="8" size-lg="6">
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Codigo escaneado</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonText>
                      <p>{scannedData}</p>
                    </IonText>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          )}
          {productDetails ? (
            <IonRow className="ion-justify-content-center ion-margin-top">
              <IonCol size="12" size-md="8" size-lg="6">
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Detalles del Producto</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonText>
                      <p><strong>Nombre:</strong> {productDetails.nombre}</p>
                      <p><strong>Categoría:</strong> {productDetails.categoria}</p>
                      <p><strong>Código:</strong> {productDetails.codigo}</p>
                      <p><strong>Precio:</strong> {productDetails.precio}</p>
                      <p><strong>Cantidad:</strong> {productDetails.cantidad}</p>
                    </IonText>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          ) : (
            scannedData && (
              <IonRow className="ion-justify-content-center ion-margin-top">
                <IonCol size="12" size-md="8" size-lg="6">
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>No se encontraron detalles del producto</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <IonText>
                        <p>No se encontraron detalles del producto para este código.</p>
                      </IonText>
                    </IonCardContent>
                  </IonCard>
                </IonCol>
              </IonRow>
            )
          )}
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Home;
