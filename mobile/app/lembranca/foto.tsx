import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Image,
} from 'expo-image';


export default function FotoLembrancaScreen() {
  const params =
    useLocalSearchParams<{
      uri?: string;
      destino?: string;
    }>();


  const uri =
    params.uri;


  const destino =
    params.destino ||
    'Sua viagem';


  return (
    <SafeAreaView
      style={
        styles.screen
      }
    >
      <View
        style={
          styles.header
        }
      >
        <Pressable
          style={
            styles.backButton
          }
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={
              styles.backText
            }
          >
            ‹
          </Text>
        </Pressable>


        <View
          style={
            styles.headerTextArea
          }
        >
          <Text
            style={
              styles.eyebrow
            }
          >
            SDD
          </Text>

          <Text
            style={
              styles.title
            }
          >
            {destino}
          </Text>
        </View>
      </View>


      <View
        style={
          styles.imageArea
        }
      >
        {uri ? (
          <Image
            source={{
              uri:
                uri,
            }}
            style={
              styles.image
            }
            contentFit="contain"
            transition={
              150
            }
          />
        ) : (
          <View
            style={
              styles.empty
            }
          >
            <Text
              style={
                styles.emptyText
              }
            >
              Não foi possível abrir esta lembrança.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}


const styles =
  StyleSheet.create({
    screen: {
      flex:
        1,

      backgroundColor:
        '#16131a',
    },


    header: {
      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        18,

      paddingTop:
        8,

      paddingBottom:
        12,

      backgroundColor:
        '#16131a',
    },


    backButton: {
      width:
        44,

      height:
        44,

      borderRadius:
        22,

      backgroundColor:
        'rgba(255,255,255,0.1)',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        12,
    },


    backText: {
      fontSize:
        34,

      lineHeight:
        36,

      color:
        '#ffffff',
    },


    headerTextArea: {
      flex:
        1,
    },


    eyebrow: {
      fontSize:
        8,

      fontWeight:
        '900',

      letterSpacing:
        1.4,

      color:
        '#b89cff',
    },


    title: {
      marginTop:
        2,

      fontSize:
        18,

      fontWeight:
        '900',

      color:
        '#ffffff',
    },


    imageArea: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    image: {
      width:
        '100%',

      height:
        '100%',
    },


    empty: {
      padding:
        30,
    },


    emptyText: {
      fontSize:
        13,

      lineHeight:
        20,

      textAlign:
        'center',

      color:
        '#ffffff',
    },
  });