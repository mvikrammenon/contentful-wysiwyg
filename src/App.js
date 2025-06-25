import React, { useEffect, useMemo } from 'react';
import { useSDK } from '@contentful/app-sdk';
// Heading and Paragraph might not be needed here if PageScreen is fully replaced
// import { Heading, Paragraph } from '@contentful/f36-components';
import LayoutEditor from './components/LayoutEditor/LayoutEditor';
import LayoutSearchPage from './components/LayoutSearchPage/LayoutSearchPage'; // Import the new page

function AppConfig({ sdk }) {
  useEffect(() => {
    sdk.app.setReady();
  }, [sdk]);

  // Later, we might pass instance parameters or other SDK data to LayoutEditor
  // For now, sdk.app will be used by LayoutEditor for things like notifications, etc.
  // And sdk.space / sdk.ids for fetching/saving data.

  return <LayoutEditor space={sdk.space} ids={sdk.ids} app={sdk.app} />;
}

// PageScreen is now replaced by LayoutSearchPage for the 'page' location
// function PageScreen({ sdk }) {
//   return (
//     <>
//       <Heading>Layout Search</Heading>
//       <Paragraph>Search and manage your saved layouts.</Paragraph>
//     </>
//   );
// }

const App = () => {
  const sdk = useSDK();

  const Component = useMemo(() => {
    if (sdk.location.is(locations.LOCATION_APP_CONFIG)) {
      return <AppConfig sdk={sdk} />;
    }
    if (sdk.location.is(locations.LOCATION_PAGE)) {
      // Render LayoutSearchPage instead of the old PageScreen
      return <LayoutSearchPage sdk={sdk} />;
    }
    return null;
  }, [sdk, sdk.location]);

  return Component ? Component : null;
};

// Contentful App SDK Location constants
const locations = {
  LOCATION_APP_CONFIG: 'app-config',
  LOCATION_ENTRY_FIELD: 'entry-field',
  LOCATION_ENTRY_EDITOR: 'entry-editor',
  LOCATION_DIALOG: 'dialog',
  LOCATION_ENTRY_SIDEBAR: 'entry-sidebar',
  LOCATION_PAGE: 'page',
  LOCATION_HOME: 'home',
};


export default App;
