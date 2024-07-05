import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonInput,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
  IonCardTitle,
} from '@ionic/react';
import { isPlatform } from '@ionic/react';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { ref, set, getDatabase, onDisconnect } from 'firebase/database';
import { app } from '../firebase';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { Button } from "@nextui-org/react";
import { Card, CardHeader, CardBody } from "@nextui-org/react";
import emailjs from 'emailjs-com';

interface ProductDetails {
  nombre: string;
  categoria: string;
  codigo: string;
  precio: number;
  cantidad: number;
}

const Home: React.FC = () => {
  const db = getDatabase(app);
  const firestore = getFirestore(app);
  const [scannedData, setScannedData] = useState<string>('');
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const requestPermissions = async () => {
      if (isPlatform('android') || isPlatform('ios')) {
        await BarcodeScanner.requestPermissions();
      }
    };
    requestPermissions();

    const databaseRef = ref(db, 'codigo');
    onDisconnect(databaseRef).remove().then(() => {
      console.log('Dato será eliminado en caso de desconexión.');
    }).catch((error) => {
      console.error('Error configurando onDisconnect:', error);
      handleError('Error configurando onDisconnect');
    });
  }, []);

  const scanBarcodeNative = async () => {
    try {
      const { barcodes } = await BarcodeScanner.scan({
        formats: [BarcodeFormat.QrCode, BarcodeFormat.Code128, BarcodeFormat.Ean13],
      });
      if (barcodes.length > 0) {
        const scannedValue = barcodes[0].rawValue || 'No data found';
        setScannedData(scannedValue);
        sendToRealtimeDatabase(scannedValue);
        fetchProductDetails(scannedValue);
      } else {
        setScannedData('No barcodes found');
      }
    } catch (error) {
      console.error(error);
      handleError('Error scanning barcode');
    }
  };

  const sendToRealtimeDatabase = (data: string) => {
    const databaseRef = ref(db, 'codigo');
    set(databaseRef, {
      value: data,
      timestamp: new Date().toISOString(),
    }).catch(error => {
      console.error(error);
      handleError('Error sending data to database');
    });
  };

  const fetchProductDetails = async (codigo: string) => {
    try {
      const q = query(collection(firestore, 'inventario'), where('codigo', '==', codigo));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const productData = querySnapshot.docs[0].data() as ProductDetails;
        setProductDetails(productData);
      } else {
        setProductDetails(null);
      }
    } catch (error) {
      console.error(error);
      handleError('Error fetching product details');
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

  const handleDone = () => {
    const databaseRef = ref(db, 'codigo');
    set(databaseRef, null).catch(error => {
      console.error(error);
      handleError('Error clearing database data');
    });
    setScannedData('');
    setProductDetails(null);
    setManualCode('');
    setError(null);
  };

  const handleError = (message: string) => {
    setError(message);
    sendErrorEmail(message);
  };

  const sendErrorEmail = (message: string) => {
    const templateParams = {
      to_email: 'soportepeques6@gmail.com',
      message: message,
    };

    emailjs.send('your_service_id', 'your_template_id', templateParams, 'your_user_id')
      .then((response) => {
        console.log('Email sent successfully!', response.status, response.text);
      }, (err) => {
        console.error('Failed to send email. Error: ', err);
      });
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
          <IonRow className="flex items-center justify-center">
            <IonCol size="12" size-md="8" size-lg="6">
              <div className="flex flex-col items-center">
                <Button
                  color="primary"
                  variant="solid"
                  className="ion-margin-top bg-blue-500 hover:bg-red-700 text-white px-8 py-4 text-lg"
                  onClick={scanBarcode}
                >
                  Escanear con Camara
                </Button>
                <IonInput
                  className="ion-margin-top w-full max-w-md"
                  value={manualCode}
                  placeholder="Ingresar codigo Manual"
                  onIonChange={e => setManualCode(e.detail.value!)}
                  clearInput
                />
                <Button
                  color="primary"
                  variant="solid"
                  className="ion-margin-top bg-blue-500 hover:bg-red-700 text-white px-8 py-4 text-lg"
                  onClick={handleManualCodeInput}
                >
                  Buscar
                </Button>
                <Button
                  color="secondary"
                  variant="solid"
                  className="ion-margin-top bg-gray-500 hover:bg-gray-700 text-white px-8 py-4 text-lg"
                  onClick={handleDone}
                >
                  Listo
                </Button>
              </div>
            </IonCol>
          </IonRow>
          {scannedData && (
            <IonRow className="ion-justify-content-center ion-margin-top">
              <IonCol size="12" size-md="8" size-lg="6">
                <Card className='bg-black'>
                  <CardHeader>
                    <IonCardTitle>Codigo escaneado</IonCardTitle>
                  </CardHeader>
                  <CardBody>
                    <IonText style={{ color: 'white' }}>
                      <p>{scannedData}</p>
                    </IonText>
                  </CardBody>
                </Card>
              </IonCol>
            </IonRow>
          )}
          {productDetails ? (
            <IonRow className="ion-justify-content-center ion-margin-top">
              <IonCol size="12" size-md="8" size-lg="6">
                <Card className='bg-black'>
                  <CardHeader>
                    <IonCardTitle>Detalles del Producto</IonCardTitle>
                  </CardHeader>
                  <CardBody>
                    <IonText style={{ color: 'white' }}>
                      <p><strong>Nombre:</strong> {productDetails.nombre}</p>
                      <p><strong>Categoría:</strong> {productDetails.categoria}</p>
                      <p><strong>Código:</strong> {productDetails.codigo}</p>
                      <p><strong>Precio:</strong> {productDetails.precio}</p>
                      <p><strong>Cantidad:</strong> {productDetails.cantidad}</p>
                    </IonText>
                  </CardBody>
                </Card>
              </IonCol>
            </IonRow>
          ) : (
            scannedData && (
              <IonRow className="ion-justify-content-center ion-margin-top">
                <IonCol size="12" size-md="8" size-lg="6">
                  <Card className='bg-black'>
                    <CardHeader>
                      <IonCardTitle>No se encontraron detalles del producto</IonCardTitle>
                    </CardHeader>
                    <CardBody>
                      <IonText style={{ color: "white" }}>
                        <p>No se encontraron detalles del producto para este código.</p>
                      </IonText>
                    </CardBody>
                  </Card>
                </IonCol>
              </IonRow>
            )
          )}
          {error && (
            <IonRow className="ion-justify-content-center ion-margin-top">
              <IonCol size="12" size-md="8" size-lg="6">
                <Card className='bg-black'>
                  <CardHeader>
                    <IonCardTitle>Error</IonCardTitle>
                  </CardHeader>
                  <CardBody>
                    <IonText style={{ color: "white" }}>
                      <p>{error}</p>
                    </IonText>
                  </CardBody>
                </Card>
              </IonCol>
            </IonRow>
          )}
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Home;
