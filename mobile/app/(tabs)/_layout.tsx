
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarButton: HapticTab,

        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#dddddd',
        },

        tabBarActiveTintColor: '#6d28d9',
        tabBarInactiveTintColor: '#888888',

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      {/* INÍCIO */}
      <Tabs.Screen
        name="inicio"
        options={{
          title: 'INÍCIO',
          tabBarLabel: 'INÍCIO',

          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={27}
              name="house"
              color={
                typeof color === 'string'
                  ? color
                  : '#888888'
              }
            />
          ),
        }}
      />

      {/* EU VOU */}
      <Tabs.Screen
        name="planejamento"
        options={{
          title: 'EU VOU!',
          tabBarLabel: 'EU VOU!',

          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={27}
              name="airplane"
              color={
                typeof color === 'string'
                  ? color
                  : '#888888'
              }
            />
          ),
        }}
      />

      {/* ROLÊ */}
      <Tabs.Screen
        name="locais"
        options={{
          title: 'ROLÊ!',
          tabBarLabel: 'ROLÊ!',

          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="car"
              color={
                typeof color === 'string'
                  ? color
                  : '#888888'
              }
            />
          ),
        }}
      />

      {/* maIA */}
      <Tabs.Screen
        name="maia"
        options={{
          title: 'maIA',
          tabBarLabel: 'maIA',

          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={27}
              name="sparkles"
              color={
                typeof color === 'string'
                  ? color
                  : '#888888'
              }
            />
          ),
        }}
      />

      {/* EU CONTO */}
      <Tabs.Screen
        name="conto"
        options={{
          title: 'EU CONTO!',
          tabBarLabel: 'EU CONTO!',

          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={27}
              name="star"
              color={
                typeof color === 'string'
                  ? color
                  : '#888888'
              }
            />
          ),
        }}
      />

      {/* SDD - LEMBRANÇAS */}
      <Tabs.Screen
        name="sdd"
        options={{
          title: 'SDD <3',
          tabBarLabel: 'SDD <3',

          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={27}
              name="photo.on.rectangle.angled"
              color={
                typeof color === 'string'
                  ? color
                  : '#888888'
              }
            />
          ),
        }}
      />

      {/* ROTA INTERNA */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
