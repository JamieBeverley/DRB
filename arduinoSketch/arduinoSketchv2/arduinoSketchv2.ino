

// Setup RFID reader///////////////////////////////////////////////////////////////
#include <SPI.h>
#include <MFRC522.h>

// 3.3v - 3.3v
#define RST_PIN         9          // Configurable, see typical pin layout above
// GND - GND
// skip
// Miso - 12
// mosi - 11
// SCK  - 13
#define SS_PIN          10         // Configurable, see typical pin layout above // AKA SDA

MFRC522 mfrc522(SS_PIN, RST_PIN);  // Create MFRC522 instance
String uid;

/// Encoder /////////////////////////////////////////////////////////
//these pins can not be changed 2/3 are special pins
int encoderPin1 = 2;  // as in "A"
int encoderPin2 = 3;  // as in "B" - C gets ground from above 13

volatile int lastEncoded = 0;
volatile long encoderValue = 0;

long lastencoderValue = 0;

int lastMSB = 0;
int lastLSB = 0;

//////////////////////////// Vibration motoer /////////////////

int vibrationPin = 6;
int vib=0;

// Volume Pot ////////////////////////////////////////////////

float vol;
float lastVol;
void setup() {
  //////////////////////////   RFID //////////////////////////////////////
  Serial.begin(9600);   // Initialize serial communications with the PC
  while (!Serial);    // Do nothing if no serial port is opened (added for Arduinos based on ATMEGA32U4)
  SPI.begin();      // Init SPI bus
  mfrc522.PCD_Init();   // Init MFRC522
  mfrc522.PCD_DumpVersionToSerial();  // Show details of PCD - MFRC522 Card Reader details
  Serial.println(F("Scan PICC to see UID, SAK, type, and data blocks..."));

 //////////////////////////   Encoder //////////////////////////////////////
  
  
  pinMode(encoderPin1, INPUT);
  pinMode(encoderPin2, INPUT);
  
  digitalWrite(encoderPin1, HIGH); //turn pullup resistor on
  digitalWrite(encoderPin2, HIGH); //turn pullup resistor on
  
  //call updateEncoder() when any high/low changed seen
  //on interrupt 0 (pin 2), or interrupt 1 (pin 3)
  // need to do this with an interrupt because otherwise rfid gets screwy
  attachInterrupt(0, updateEncoder, CHANGE);
  attachInterrupt(1, updateEncoder, CHANGE);

  // vibration

  pinMode(vibrationPin, OUTPUT);
  digitalWrite(vibrationPin, LOW);

  // vol pot.
  vol = analogRead(A0);
}

void loop() {

  // Detecting and causing a vibration...
  int in = Serial.read();
  if(in!=-1){
    vib = max(min(255,in),0);
  } else {
    vib = max(vib-1,0);
  }
  analogWrite(vibrationPin,vib);

  vol= min(1023,max(0,analogRead(A0)))/1023.0;
  // Volume pot
  if ((round(vol*10)/10.0)!=(round(lastVol*10)/10.0)){
//    char ugh[10];
//    sprintf(ugh, "v%f", vol);
    Serial.print("v");
    Serial.println(vol);
    lastVol=vol;
  }

  /// RFID stuff................
  // Look for new cards
  if ( ! mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  // Select one of the cards
  if ( ! mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  uid = matches();

  if(uid!=""){
    Serial.println("l"+uid);
  }

}


String matches (){
  String res = "";

  // Card
  if (mfrc522.uid.uidByte[0] == 0x15 && 
      mfrc522.uid.uidByte[1] == 0x45 &&
      mfrc522.uid.uidByte[2] == 0xaa &&
      mfrc522.uid.uidByte[3] == 0xab) {

     res = "glasseyes.mp3";
  } else if ( // tab
      mfrc522.uid.uidByte[0] == 0x50 && 
      mfrc522.uid.uidByte[1] == 0x60 &&
      mfrc522.uid.uidByte[2] == 0x83 &&
      mfrc522.uid.uidByte[3] == 0x4D){
    res = "dunno.mp3";
  } else{
    Serial.println("no recognized uid");
  }
  return res;
  
}


void updateEncoder(){
  int MSB = digitalRead(encoderPin1); //MSB = most significant bit
  int LSB = digitalRead(encoderPin2); //LSB = least significant bit
  
  int encoded = (MSB << 1) |LSB; //converting the 2 pin value to single number 
  int sum = (lastEncoded << 2) | encoded; //adding it to the previous encoded value 
  if(sum == 0b1101 || sum == 0b0100 || sum == 0b0010 || sum == 0b1011) {
     Serial.println("s1");
  }
  if(sum == 0b1110 || sum == 0b0111 || sum == 0b0001 || sum == 0b1000) 
    Serial.println("s-1");
  lastEncoded = encoded; //store this value for next time 
} 
