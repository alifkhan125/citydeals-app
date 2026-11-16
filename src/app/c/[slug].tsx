import { Redirect, useLocalSearchParams } from 'expo-router';

export default function SharedCouponRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <Redirect href={{ pathname: '/screens/coupon-details', params: { shareSlug: slug || '' } }} />;
}
